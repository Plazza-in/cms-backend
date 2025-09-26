#!/usr/bin/env python3
"""
Data Collation and Migration Script
Collates data from CSV, original_all_products table, and distributor_master_list table
and inserts into catalogue table
"""

import pandas as pd
import argparse
import psycopg
from psycopg.rows import dict_row
import logging
import sys
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal, InvalidOperation
import traceback
import json
import threading
from queue import Queue
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('collation_migration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class ErrorLogger:
    """Thread-safe error logger for CSV output"""
    def __init__(self, error_file_prefix: str = 'collation_skipped_rows'):
        self.error_queue = Queue()
        self.error_rows = []
        self.lock = threading.Lock()
        self.stop_event = threading.Event()
        self.error_file = f'{error_file_prefix}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        self.logger_thread = threading.Thread(target=self._process_errors)
        self.logger_thread.daemon = True
        self.logger_thread.start()

    def add_error(self, error_dict: Dict, error_type: str, error_details: str = None):
        """Add an error to the queue for CSV logging"""
        # Add timestamp and additional error information
        error_dict['error_timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        error_dict['error_type'] = error_type
        error_dict['error_details'] = error_details
        error_dict['status'] = 'Skipped'
        self.error_queue.put(error_dict)

    def _process_errors(self):
        """Process errors in background thread"""
        while not self.stop_event.is_set() or not self.error_queue.empty():
            try:
                error_dict = self.error_queue.get(timeout=1)
                with self.lock:
                    self.error_rows.append(error_dict)
                    self._write_to_csv(error_dict)
            except:
                continue

    def _write_to_csv(self, error_dict: Dict):
        """Write error to CSV file"""
        error_df = pd.DataFrame([error_dict])
        
        # Ensure columns are in a specific order
        columns = [
            'product_id', 'item_code', 'name', 'error_timestamp', 
            'error_type', 'error_details', 'status'
        ]
        
        # Reorder columns and fill missing columns with None
        for col in columns:
            if col not in error_df.columns:
                error_df[col] = None
        
        error_df = error_df[columns]
        
        # Append to existing file or create new
        mode = 'a' if os.path.exists(self.error_file) else 'w'
        header = not os.path.exists(self.error_file)
        
        error_df.to_csv(self.error_file, mode=mode, header=header, index=False)

    def stop(self):
        """Stop the error logger and write any remaining errors"""
        self.stop_event.set()
        self.logger_thread.join()
        # Write any remaining errors
        if not self.error_queue.empty():
            while not self.error_queue.empty():
                error_dict = self.error_queue.get()
                self._write_to_csv(error_dict)
        logger.info(f"All skipped rows have been written to {self.error_file}")

class DataCollator:
    """Handles collation of data from multiple sources and migration to catalogue table"""
    
    def __init__(self, db_config: Dict[str, str], erp_db_config: Dict[str, str]):
        """Initialize collator with database configuration"""
        self.db_config = db_config
        self.erp_db_config = erp_db_config
        self.connection = None
        self.erp_connection = None
        self.validation_errors = []
        self.error_logger = ErrorLogger('collation_skipped_rows')
        self.skipped_no_metadata = 0
        self.skipped_no_pricing = 0
        
    def connect_db(self) -> bool:
        """Establish database connections"""
        try:
            def build_conninfo(cfg: Dict[str, str]) -> str:
                parts = []
                if cfg.get('host'):
                    parts.append(f"host={cfg['host']}")
                if cfg.get('port'):
                    parts.append(f"port={cfg['port']}")
                # psycopg expects dbname
                dbname = cfg.get('dbname') or cfg.get('database')
                if dbname:
                    parts.append(f"dbname={dbname}")
                if cfg.get('user'):
                    parts.append(f"user={cfg['user']}")
                if cfg.get('password'):
                    parts.append(f"password={cfg['password']}")
                if cfg.get('sslmode'):
                    parts.append(f"sslmode={cfg['sslmode']}")
                if cfg.get('sslrootcert'):
                    parts.append(f"sslrootcert={cfg['sslrootcert']}")
                return ' '.join(parts)

            # Connect to main database (defaultdb)
            main_conninfo = build_conninfo(self.db_config)
            self.connection = psycopg.connect(main_conninfo)
            self.connection.autocommit = False  # Enable transaction control
            logger.info("Main database connection established successfully")

            # Connect to ERP database for distributor_master_list
            erp_conninfo = build_conninfo(self.erp_db_config)
            self.erp_connection = psycopg.connect(erp_conninfo)
            logger.info("ERP database connection established successfully")

            return True
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return False
    
    def disconnect_db(self):
        """Close database connections"""
        if self.connection:
            self.connection.close()
            logger.info("Main database connection closed")
        if self.erp_connection:
            self.erp_connection.close()
            logger.info("ERP database connection closed")
    
    def load_csv(self, csv_file_path: str) -> Optional[pd.DataFrame]:
        """Load and validate CSV file"""
        try:
            logger.info(f"Loading CSV file: {csv_file_path}")
            
            # Read CSV with proper handling
            df = pd.read_csv(
                csv_file_path,
                encoding='utf-8',
                dtype=str,  # Load all as strings initially for validation
                na_values=['', 'NULL', 'null', 'None', 'nan'],
                keep_default_na=True
            )
            
            logger.info(f"CSV loaded successfully. Shape: {df.shape}")
            logger.info(f"Columns: {list(df.columns)}")
            
            return df
            
        except Exception as e:
            logger.error(f"Failed to load CSV file: {e}")
            return None
    
    def get_metadata_batch(self, product_ids: List[str]) -> Dict[str, Dict]:
        """Get metadata from original_all_products table for multiple product IDs"""
        if not product_ids:
            return {}
        
        query = """
        SELECT product_id, name, manufacturers, salt_composition, medicine_type,
               introduction, benefits, description, how_to_use, safety_advise,
               if_miss, packaging_detail, package, qty, product_form, mrp,
               prescription_required, fact_box, primary_use, storage, use_of,
               common_side_effect, alcohol_interaction, pregnancy_interaction,
               lactation_interaction, driving_interaction, kidney_interaction,
               liver_interaction, manufacturer_address, q_a, how_it_works,
               interaction, manufacturer_details, marketer_details, reference,
               normalized_name, image_url, distributor_mrp, plazza_selling_price_incl_gst,
               effective_customer_discount, distributor, plazza_price_pack,
               fulfilled_by, name_search_words, directions_for_use, information,
               key_benefits, key_ingredients, safety_information, breadcrumbs,
               country_of_origin
        FROM original_all_products
        WHERE product_id = ANY(%s)
        """
        
        try:
            with self.connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(query, (product_ids,))
                results = cursor.fetchall()
            
            metadata = {}
            for row in results:
                metadata[row['product_id']] = dict(row)
            
            logger.info(f"Found metadata for {len(metadata)} out of {len(product_ids)} product IDs")
            if metadata:
                logger.info(f"Sample metadata keys: {list(metadata.keys())[:3]}")
            return metadata
        except Exception as e:
            logger.error(f"Error fetching metadata: {str(e)}")
            return {}
    
    def get_price_details_batch(self, item_codes: List[str]) -> Dict[str, Dict]:
        """Get price details from distributor_master_list for multiple item codes"""
        if not item_codes:
            return {}
        
        # Create mapping of original codes to lowercase versions for searching
        code_mapping = {}
        lowercase_codes = []
        for code in item_codes:
            if code and str(code).strip():
                clean_code = str(code).strip()
                lowercase_code = clean_code.lower()
                code_mapping[lowercase_code] = clean_code
                lowercase_codes.append(lowercase_code)
        
        if not lowercase_codes:
            return {}
        
        query = """
        SELECT item_code, product_name, manufacturer, mrp, purchase_rate, gst_rate,
               plazza_selling_price_incl_gst, effective_customer_discount, distributor,
               hsn_code, original_item_code
        FROM distributor_master_list
        WHERE LOWER(item_code) = ANY(%s) OR LOWER(original_item_code) = ANY(%s)
        """
        
        try:
            with self.erp_connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(query, (lowercase_codes, lowercase_codes))
                results = cursor.fetchall()
            
            price_details = {}
            
            for row in results:
                # Map both item_code and original_item_code variations
                for code_field in ['item_code', 'original_item_code']:
                    if row[code_field]:
                        original_code = code_mapping.get(row[code_field].lower())
                        if original_code:
                            price_details[original_code] = {
                                'distributor_mrp': float(row['mrp']) if row['mrp'] else None,
                                'purchase_rate': float(row['purchase_rate']) if row['purchase_rate'] else None,
                                'gst_rate': float(row['gst_rate']) if row['gst_rate'] else None,
                                'plazza_selling_price_incl_gst': float(row['plazza_selling_price_incl_gst']) if row['plazza_selling_price_incl_gst'] else None,
                                'effective_customer_discount': float(row['effective_customer_discount']) if row['effective_customer_discount'] else None,
                                'distributor': row['distributor'],
                                'hsn_code': row['hsn_code']
                            }
            
            logger.info(f"Found price details for {len(price_details)} out of {len(item_codes)} item codes")
            if price_details:
                logger.info(f"Sample price keys: {list(price_details.keys())[:3]}")
            return price_details
        except Exception as e:
            logger.error(f"Error fetching price details: {str(e)}")
            return {}
    
    def validate_and_collate_row(self, row: pd.Series, row_index: int, metadata: Dict[str, Dict], price_details: Dict[str, Dict]) -> Tuple[bool, Dict[str, Any]]:
        """Validate and collate data from multiple sources for a single row"""
        errors = []
        collated_data = {}
        
        try:
            # Get basic info from CSV
            product_id = str(row.get('product_id', '')).strip()
            item_code = str(row.get('item_code', '')).strip()
            
            # Validate required fields
            if not product_id or product_id == '':
                errors.append("Product ID is required")
                return False, {'errors': errors, 'data': {}}
            
            if not item_code or item_code == '':
                errors.append("Item code is required")
                return False, {'errors': errors, 'data': {}}
            
            # Get metadata from original_all_products
            product_metadata = metadata.get(product_id)
            if not product_metadata:
                error_dict = {
                    'product_id': product_id,
                    'item_code': item_code,
                    'name': ''
                }
                self.error_logger.add_error(
                    error_dict,
                    error_type='Missing Metadata',
                    error_details=f"Product metadata not found in original_all_products for product_id: {product_id}"
                )
                self.skipped_no_metadata += 1
                logger.warning(f"Row {row_index}: Skipping product - No metadata found for product_id '{product_id}'")
                return False, {'errors': ['Missing metadata'], 'data': {}}
            
            # Get pricing data from distributor_master_list
            pricing_data = price_details.get(item_code, {})
            if not pricing_data:
                error_dict = {
                    'product_id': product_id,
                    'item_code': item_code,
                    'name': product_metadata.get('name', '')
                }
                self.error_logger.add_error(
                    error_dict,
                    error_type='Missing Price Details',
                    error_details=f"Price details not found in distributor_master_list for item_code: {item_code}"
                )
                self.skipped_no_pricing += 1
                logger.warning(f"Row {row_index}: Skipping product - No pricing data found for item_code '{item_code}'")
                return False, {'errors': ['Missing pricing data'], 'data': {}}
            
            # Process inventory and location from CSV
            inventory_quantity = self._validate_inventory_quantity(row.get('Store Inventory', 0), errors)
            location = self._validate_location_array(row.get('Location', ''), errors)
            
            # Collate all data
            collated_data = {
                # Basic identifiers
                'product_id': product_id,
                'dist_item_code': item_code,
                
                # Metadata from original_all_products
                'name': product_metadata.get('name'),
                'manufacturers': product_metadata.get('manufacturers'),
                'salt_composition': product_metadata.get('salt_composition'),
                'medicine_type': product_metadata.get('medicine_type'),
                'introduction': product_metadata.get('introduction'),
                'benefits': product_metadata.get('benefits'),
                'description': product_metadata.get('description'),
                'how_to_use': product_metadata.get('how_to_use'),
                'safety_advise': product_metadata.get('safety_advise'),
                'if_miss': product_metadata.get('if_miss'),
                'packaging_detail': product_metadata.get('packaging_detail'),
                'package': product_metadata.get('package'),
                'qty': product_metadata.get('qty'),
                'product_form': product_metadata.get('product_form'),
                'mrp': product_metadata.get('mrp'),
                'prescription_required': product_metadata.get('prescription_required'),
                'fact_box': product_metadata.get('fact_box'),
                'primary_use': product_metadata.get('primary_use'),
                'storage': product_metadata.get('storage'),
                'use_of': product_metadata.get('use_of'),
                'common_side_effect': product_metadata.get('common_side_effect'),
                'alcohol_interaction': product_metadata.get('alcohol_interaction'),
                'pregnancy_interaction': product_metadata.get('pregnancy_interaction'),
                'lactation_interaction': product_metadata.get('lactation_interaction'),
                'driving_interaction': product_metadata.get('driving_interaction'),
                'kidney_interaction': product_metadata.get('kidney_interaction'),
                'liver_interaction': product_metadata.get('liver_interaction'),
                'manufacturer_address': product_metadata.get('manufacturer_address'),
                'q_a': product_metadata.get('q_a'),
                'how_it_works': product_metadata.get('how_it_works'),
                'interaction': product_metadata.get('interaction'),
                'manufacturer_details': product_metadata.get('manufacturer_details'),
                'marketer_details': product_metadata.get('marketer_details'),
                'reference': product_metadata.get('reference'),
                'normalized_name': product_metadata.get('normalized_name'),
                'image_url': product_metadata.get('image_url'),
                'plazza_price_pack': product_metadata.get('plazza_price_pack'),
                'fulfilled_by': product_metadata.get('fulfilled_by', 'Fulfilled by Plazza'),
                'name_search_words': product_metadata.get('name_search_words'),
                'directions_for_use': product_metadata.get('directions_for_use'),
                'information': product_metadata.get('information'),
                'key_benefits': product_metadata.get('key_benefits'),
                'key_ingredients': product_metadata.get('key_ingredients'),
                'safety_information': product_metadata.get('safety_information'),
                'breadcrumbs': product_metadata.get('breadcrumbs'),
                'country_of_origin': product_metadata.get('country_of_origin'),
                
                # Inventory and location from CSV
                'inventory_quantity': inventory_quantity,
                'location': location,
                
                # Pricing data from distributor_master_list
                'distributor_mrp': pricing_data.get('distributor_mrp'),
                'plazza_selling_price_incl_gst': pricing_data.get('plazza_selling_price_incl_gst'),
                'effective_customer_discount': pricing_data.get('effective_customer_discount'),
                'distributor': pricing_data.get('distributor'),
                'gst_rate': pricing_data.get('gst_rate'),
                'hsn_code': pricing_data.get('hsn_code'),
                
                # Timestamps
                'updated_at': datetime.now(),
                'created_at': datetime.now(),
                
                # Note: delivery_type column doesn't exist in catalogue table
                # Delivery type is determined by inventory_quantity (0 = deferred, >0 = instant)
                
                # JSONB columns for flexible data storage
                'c1': None,
                'c2': None, 
                'c3': None,
                'c4': None,
                'c5': None,
                
                # Categorization fields (to be populated later if needed)
                'product_category_name': None,
                'product_category_id': None,
                'product_use_case_name': None,
                'product_use_case_id': None,
                'product_sub_category_id': None,
                'product_sub_category_name': None
            }
            
            if errors:
                logger.warning(f"Row {row_index} validation errors: {'; '.join(errors)}")
                return False, {'errors': errors, 'data': collated_data}
            
            return True, collated_data
            
        except Exception as e:
            error_msg = f"Unexpected error collating row {row_index}: {str(e)}"
            logger.error(error_msg)
            return False, {'errors': [error_msg], 'data': {}}
    
    def _validate_inventory_quantity(self, value: Any, errors: List[str]) -> int:
        """Validate inventory quantity from Store Inventory column"""
        try:
            if pd.isna(value) or value == '' or str(value).strip() == '':
                return 0  # Default value when Store Inventory is blank
            inventory_qty = int(float(str(value)))
            if inventory_qty < 0:
                errors.append("Inventory quantity cannot be negative")
                return 0
            return inventory_qty
        except (ValueError, TypeError):
            errors.append(f"Invalid inventory quantity format: {value}")
            return 0
    
    def _validate_location_array(self, value: Any, errors: List[str]) -> Optional[List[str]]:
        """Validate and convert location to array format"""
        if pd.isna(value) or value == '' or value == 'nan':
            return None
        
        try:
            # If value is already a list, return it
            if isinstance(value, list):
                return [str(loc).strip() for loc in value if loc and str(loc).strip()]
            
            # If value is a string, try to parse as JSON array first
            if isinstance(value, str):
                value = value.strip()
                # Remove curly braces if present
                value = value.strip('{}')
                
                if value.startswith('[') and value.endswith(']'):
                    try:
                        loc_list = json.loads(value)
                        if isinstance(loc_list, list):
                            return [str(loc).strip() for loc in loc_list if loc and str(loc).strip()]
                    except json.JSONDecodeError:
                        pass
                
                # If not JSON, treat as single location or comma-separated locations
                if ',' in value:
                    return [loc.strip() for loc in value.split(',') if loc.strip()]
                else:
                    return [value.strip()] if value.strip() else None
            
            # For other types, convert to string and return as single-item array
            return [str(value).strip()] if str(value).strip() else None
            
        except Exception as e:
            errors.append(f"Invalid location format: {str(e)}")
            return None
    
    def check_duplicate_products(self, df: pd.DataFrame) -> List[str]:
        """Check for duplicate product IDs in the dataset"""
        duplicates = df[df.duplicated(subset=['product_id'], keep=False)]['product_id'].tolist()
        if duplicates:
            logger.warning(f"Found duplicate product IDs: {set(duplicates)}")
        return duplicates
    
    def check_existing_products(self, product_ids: List[str]) -> List[str]:
        """Check which product IDs already exist in the catalogue table"""
        try:
            cursor = self.connection.cursor()
            placeholders = ','.join(['%s'] * len(product_ids))
            query = f"SELECT product_id FROM catalogue WHERE product_id IN ({placeholders})"
            cursor.execute(query, product_ids)
            existing = [row[0] for row in cursor.fetchall()]
            cursor.close()
            
            if existing:
                logger.warning(f"Found {len(existing)} existing product IDs in catalogue table")
            
            return existing
            
        except Exception as e:
            logger.error(f"Error checking existing products: {e}")
            return []
    
    def insert_batch(self, valid_data: List[Dict[str, Any]]) -> bool:
        """Insert batch of validated data using transaction"""
        try:
            with self.connection.cursor() as cursor:
                # Prepare the insert statement
                columns = list(valid_data[0].keys())
                placeholders = ','.join(['%s'] * len(columns))
                insert_query = f"""
                    INSERT INTO catalogue ({','.join(columns)}) 
                    VALUES ({placeholders})
                """

                # Prepare data for batch insert
                batch_data = []
                for row_data in valid_data:
                    row_values = [row_data.get(col) for col in columns]
                    batch_data.append(row_values)

                # Execute batch insert
                cursor.executemany(insert_query, batch_data)

                # Commit transaction
                self.connection.commit()
            
            logger.info(f"Successfully inserted {len(valid_data)} records")
            return True
            
        except Exception as e:
            logger.error(f"Error during batch insert: {e}")
            logger.error(traceback.format_exc())
            
            # Rollback transaction
            if self.connection:
                self.connection.rollback()
                logger.info("Transaction rolled back")
            
            return False
    
    def collate_and_migrate(self, csv_file_path: str, batch_size: int = 50) -> Dict[str, Any]:
        """Main collation and migration function"""
        logger.info("=== Starting Data Collation and Migration ===")
        
        results = {
            'total_rows': 0,
            'successful_inserts': 0,
            'validation_failures': 0,
            'duplicate_failures': 0,
            'existing_products': 0,
            'errors': []
        }
        
        try:
            # Load CSV
            df = self.load_csv(csv_file_path)
            if df is None:
                results['errors'].append("Failed to load CSV file")
                return results
            
            results['total_rows'] = len(df)
            
            # Connect to database
            if not self.connect_db():
                results['errors'].append("Failed to connect to database")
                return results
            
            # Check for duplicates in CSV
            duplicates = self.check_duplicate_products(df)
            if duplicates:
                results['duplicate_failures'] = len(duplicates)
                results['errors'].append(f"Found duplicate product IDs in CSV: {set(duplicates)}")
                # Remove duplicates, keeping first occurrence
                df = df.drop_duplicates(subset=['product_id'], keep='first')
                logger.info(f"Removed {len(duplicates)} duplicate rows from CSV")
            
            # Check for existing products in catalogue table
            product_ids = df['product_id'].tolist()
            existing = self.check_existing_products(product_ids)
            if existing:
                results['existing_products'] = len(existing)
                logger.info(f"Skipping {len(existing)} existing products")
                df = df[~df['product_id'].isin(existing)]
            
            # Process data in batches
            valid_data = []
            batch_count = 0
            
            # Process dataframe in chunks for efficient data fetching
            for chunk_start in range(0, len(df), batch_size):
                chunk_end = min(chunk_start + batch_size, len(df))
                df_chunk = df.iloc[chunk_start:chunk_end]
                
                # Extract product IDs and item codes for data fetching
                product_ids_chunk = df_chunk['product_id'].astype(str).str.strip().tolist()
                item_codes_chunk = df_chunk['item_code'].astype(str).str.strip().tolist()
                item_codes_chunk = [code for code in item_codes_chunk if code and code != 'nan']
                
                # Fetch metadata and pricing data for this batch
                logger.info(f"Fetching data for batch {batch_count + 1} ({len(product_ids_chunk)} products)")
                metadata = self.get_metadata_batch(product_ids_chunk)
                price_details = self.get_price_details_batch(item_codes_chunk)
                
                # Process each row in the batch
                for index, row in df_chunk.iterrows():
                    is_valid, row_result = self.validate_and_collate_row(row, index, metadata, price_details)
                    
                    if is_valid:
                        valid_data.append(row_result)
                    else:
                        results['validation_failures'] += 1
                        self.validation_errors.append({
                            'row_index': index,
                            'product_id': row.get('product_id', 'Unknown'),
                            'errors': row_result.get('errors', [])
                        })
                
                # Insert batch when batch_size is reached
                if valid_data:
                    if self.insert_batch(valid_data):
                        results['successful_inserts'] += len(valid_data)
                        batch_count += 1
                        logger.info(f"Completed batch {batch_count} ({len(valid_data)} records)")
                    else:
                        results['errors'].append(f"Failed to insert batch {batch_count + 1}")
                    
                    valid_data = []  # Reset batch
            
            # Generate validation error report
            if self.validation_errors:
                self._generate_error_report()
            
            # Stop error logger and write any remaining errors
            self.error_logger.stop()
            
            logger.info("=== Collation and Migration Completed ===")
            logger.info(f"Total rows processed: {results['total_rows']}")
            logger.info(f"Successful inserts: {results['successful_inserts']}")
            logger.info(f"Validation failures: {results['validation_failures']}")
            logger.info(f"Duplicate failures: {results['duplicate_failures']}")
            logger.info(f"Existing products skipped: {results['existing_products']}")
            logger.info(f"Products skipped (no metadata): {self.skipped_no_metadata}")
            logger.info(f"Products skipped (no pricing): {self.skipped_no_pricing}")
            
            return results
            
        except Exception as e:
            error_msg = f"Critical error during collation and migration: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            results['errors'].append(error_msg)
            return results
            
        finally:
            self.disconnect_db()
    
    def _generate_error_report(self):
        """Generate detailed error report for validation failures"""
        try:
            with open('collation_validation_errors.log', 'w') as f:
                f.write("COLLATION VALIDATION ERROR REPORT\n")
                f.write("=" * 50 + "\n\n")
                
                for error in self.validation_errors:
                    f.write(f"Row Index: {error['row_index']}\n")
                    f.write(f"Product ID: {error['product_id']}\n")
                    f.write("Errors:\n")
                    for err in error['errors']:
                        f.write(f"  - {err}\n")
                    f.write("\n" + "-" * 30 + "\n\n")
            
            logger.info(f"Collation validation error report saved to 'collation_validation_errors.log'")
            
        except Exception as e:
            logger.error(f"Failed to generate error report: {e}")


def main():
    """Main execution function"""
    
    parser = argparse.ArgumentParser(description="Collate data and migrate to catalogue table")
    parser.add_argument('--csv', dest='csv_path', default='single_product_test.csv', help='Path to CSV file with item_code and product_id')
    parser.add_argument('--batch-size', dest='batch_size', type=int, default=50, help='Batch size for processing')
    args = parser.parse_args()

    # Database configuration for defaultdb (catalogue and original_all_products tables)
    DB_CONFIG = {
        'host': '127.0.0.1',
        'port': '5433',
        'database': 'defaultdb',
        'user': 'postgres',
        'password': "Dolo1729!#$",
        'sslmode': 'verify-ca',
        'sslrootcert': '/Users/shashidharmittapalli/Downloads/rds-ca.pem'
    }
    
    # ERP Database configuration for plazza_erp (distributor_master_list table)
    ERP_DB_CONFIG = {
        'host': '127.0.0.1',
        'port': '5433',
        'database': 'plazza_erp',
        'user': 'postgres',
        'password': "Dolo1729!#$",
        'sslmode': 'verify-ca',
        'sslrootcert': '/Users/shashidharmittapalli/Downloads/rds-ca.pem'
    }
    
    # CSV file path
    CSV_FILE = args.csv_path
    
    # Create collator instance
    collator = DataCollator(DB_CONFIG, ERP_DB_CONFIG)
    
    # Run collation and migration
    results = collator.collate_and_migrate(CSV_FILE, batch_size=args.batch_size)
    
    # Print final summary
    print("\n" + "=" * 60)
    print("COLLATION AND MIGRATION SUMMARY")
    print("=" * 60)
    print(f"Total rows in CSV: {results['total_rows']}")
    print(f"Successfully inserted: {results['successful_inserts']}")
    print(f"Validation failures: {results['validation_failures']}")
    print(f"Duplicate products: {results['duplicate_failures']}")
    print(f"Existing products skipped: {results['existing_products']}")
    print(f"Products skipped (no metadata): {collator.skipped_no_metadata}")
    print(f"Products skipped (no pricing): {collator.skipped_no_pricing}")
    
    if results['errors']:
        print("\nCritical Errors:")
        for error in results['errors']:
            print(f"  - {error}")
    
    print("\nCheck 'collation_migration.log' for detailed logs")
    if collator.validation_errors:
        print("Check 'collation_validation_errors.log' for validation error details")
    print(f"Check '{collator.error_logger.error_file}' for skipped products details")


if __name__ == "__main__":
    main() 