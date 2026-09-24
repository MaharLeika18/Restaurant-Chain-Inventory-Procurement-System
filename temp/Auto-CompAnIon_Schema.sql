SET FOREIGN_KEY_CHECKS = 0;
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--                      Tables for User Authenticator Module
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `user_id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'OWNER', 'SECRETARY', 'EMPLOYEE') NOT NULL,
    `created_at` DATETIME NOT NULL,
    `last_update` DATETIME NULL
);

-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--                      Main Tables for Inventory Information
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
DROP TABLE IF EXISTS `product`;
CREATE TABLE `product`(
    `product_id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `product_name` VARCHAR(255) NOT NULL,
    `product_description` VARCHAR(255) NULL,
    `part_number` VARCHAR(200) NULL,
    `category_id` SMALLINT UNSIGNED NOT NULL,
    `supplier_id` SMALLINT UNSIGNED NOT NULL,
    -- `current_stock_level` SMALLINT NOT NULL,
    `storage_location` VARCHAR(255) NULL,
    `date_added` DATETIME NOT NULL,
    `last_update` DATETIME NOT NULL,
    `status` ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
    `unit_cost` DECIMAL(12, 2) NOT NULL COMMENT 'Latest supplier price; regularly update this.',
    `retail_price` DECIMAL(12, 2) NOT NULL COMMENT 'Latest selling price; regularly update this.'
);
ALTER TABLE
    `product` ADD INDEX `idx_product_name`(`product_name`);    

DROP TABLE IF EXISTS `product_category`;
CREATE TABLE `product_category`(
    `category_id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `category_name` VARCHAR(255) NOT NULL,
    `parent_category_id` SMALLINT UNSIGNED NULL,
    `date_added` DATETIME NOT NULL
);
ALTER TABLE 
    `product_category` ADD UNIQUE (category_name);
ALTER TABLE
    `product_category` ADD INDEX `idx_product_category`(`category_id`);    

DROP TABLE IF EXISTS `product_images`;
CREATE TABLE `product_images` (
    `image_id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT UNSIGNED NOT NULL,
    `image_path` VARCHAR(255) NULL,
    `date_uploaded` DATETIME NOT NULL
);
ALTER TABLE 
    `product_images` ADD UNIQUE (product_id);

DROP TABLE IF EXISTS `supplier`;
CREATE TABLE `supplier`(
    `supplier_id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `supplier_name` VARCHAR(255) NOT NULL,
    `supplier_address` VARCHAR(255) NULL,
    `supplier_contact` VARCHAR(20) NULL,
    `date_added` DATETIME NOT NULL,
    `last_update` DATETIME NOT NULL
);
ALTER TABLE 
    `supplier` ADD UNIQUE (supplier_name);

DROP TABLE IF EXISTS `compatibility`;
CREATE TABLE `compatibility`(
    `product_id` INT UNSIGNED NOT NULL,
    `bottom_year` SMALLINT NOT NULL,
    `top_year` SMALLINT NOT NULL,
    `vehicle_id` SMALLINT UNSIGNED NOT NULL
);
ALTER TABLE
    `compatibility` ADD INDEX `compatibility_product_id_index`(`product_id`);
ALTER TABLE
    `compatibility` ADD INDEX `compatibility_vehicle_id_index`(`vehicle_id`);
ALTER TABLE `compatibility`
    ADD UNIQUE (product_id, vehicle_id, bottom_year, top_year); 

DROP TABLE IF EXISTS `vehicles`;
CREATE TABLE `vehicles`(
    `vehicle_id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `model_name` VARCHAR(255) NOT NULL,
    `manufacturer_id` SMALLINT NOT NULL,

    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(manufacturer_id)
);
ALTER TABLE
    `vehicles` ADD INDEX `vehicles_manufacturer_index`(`manufacturer_id`);
ALTER TABLE  
    `vehicles` ADD UNIQUE (`model_name`, `manufacturer_id`);

ALTER TABLE vehicles DROP FOREIGN KEY vehicles_ibfk_1;
DROP TABLE IF EXISTS manufacturers;
CREATE TABLE `manufacturers` (
    `manufacturer_id` SMALLINT PRIMARY KEY AUTO_INCREMENT,
    `manufacturer_name` VARCHAR(255) UNIQUE
);
ALTER TABLE
    `manufacturers` ADD INDEX `manufacturers_name_index`(`manufacturer_name`);
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--                              Transactional Tables
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
DROP TABLE IF EXISTS `transaction_log`;
CREATE TABLE `transaction_log`(
    `transaction_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `parent_transaction_id` BIGINT UNSIGNED DEFAULT NULL,
    `transaction_date` DATETIME NOT NULL,
    `receipt_num` VARCHAR(50) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `payment_method` ENUM('CASH', 'E-WALLET', 'BANK') NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(255) NULL
);
ALTER TABLE
    `transaction_log` ADD INDEX `transaction_log_transaction_date_index`(`transaction_date`);
ALTER TABLE
    `transaction_log` ADD INDEX `transaction_log_transaction_status_date`(`status`);
ALTER TABLE 
    `transaction_log` ADD CONSTRAINT `fk_parent_transaction` FOREIGN KEY (`parent_transaction_id`) REFERENCES `transaction_log`(`transaction_id`);

DROP TABLE IF EXISTS `transaction_items`;
CREATE TABLE `transaction_items`(
    `item_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `transaction_id` BIGINT UNSIGNED NOT NULL,
    `product_id` INT UNSIGNED NOT NULL,
    `batch_id` BIGINT UNSIGNED NOT NULL,
    `quantity_sold` SMALLINT NOT NULL,
    `unit_selling_price` DECIMAL(12, 2) NOT NULL COMMENT 'Retail price per unit at the moment of sale',
    `unit_cost_at_sale` DECIMAL(12, 2) NOT NULL COMMENT 'Cost per unit from supplier at the moment of sale',
    `discount_applied` DECIMAL(12, 2) NOT NULL,
    `total_sale_value` DECIMAL(12, 2) NOT NULL COMMENT 'Total revenue: (quantity_sold * unit_selling_price) - (quantity_sold * discount_applied)',
    `total_cost` DECIMAL(12, 2) NOT NULL COMMENT 'Total cost of goods sold (COGS): quantity_sold * unit_cost_at_sale'
);
ALTER TABLE 
    `transaction_items` ADD FOREIGN KEY (`batch_id`) REFERENCES `product_batches`(`batch_id`);
ALTER TABLE
    `transaction_items` ADD INDEX `transaction_items_tx`(`transaction_id`, `product_id`);

DROP TABLE IF EXISTS `inventory_log`;
CREATE TABLE `inventory_log`(
    `log_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `product_id` INT UNSIGNED NOT NULL,
    `change_type` ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
    `quantity` SMALLINT NOT NULL,
    `unit_cost` DECIMAL(12, 2) NOT NULL,
    `log_date` DATETIME NOT NULL,
    `reference_id` BIGINT NULL COMMENT 'Links to transaction id/batch id',
    `reference_type` ENUM('SALE','PURCHASE','REFUND','ADJUSTMENT') NULL
);
ALTER TABLE
    `inventory_log` ADD INDEX `inventory_log_log_date_index`(`log_date`);

DROP TABLE IF EXISTS `purchase_orders`;
CREATE TABLE `purchase_orders`(
    `po_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `supplier_id` SMALLINT UNSIGNED NOT NULL,
    `order_date` DATETIME NOT NULL,
    `total_cost` DECIMAL(12, 2) NOT NULL
);

DROP TABLE IF EXISTS `purchase_order_items`;
CREATE TABLE `purchase_order_items`(
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `po_id` BIGINT UNSIGNED NOT NULL,
    `product_id` INT UNSIGNED NOT NULL,
    `quantity` SMALLINT NOT NULL,
    `unit_cost` DECIMAL(12, 2) NOT NULL
);
ALTER TABLE 
    `purchase_order_items` ADD UNIQUE (po_id, product_id);

DROP TABLE IF EXISTS `product_batches`;
CREATE TABLE `product_batches`(
    `batch_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `po_id` BIGINT UNSIGNED,
    `product_id` INT UNSIGNED NOT NULL,
    `supplier_id` SMALLINT UNSIGNED NOT NULL,
    `quantity_received` SMALLINT NOT NULL,
    `quantity_remaining` SMALLINT NOT NULL,
    `unit_cost` DECIMAL(12, 2) NOT NULL,
    `date_received` DATETIME NOT NULL,
    `barcode` VARCHAR(100) NOT NULL UNIQUE 
);
ALTER TABLE `product_batches`
    ADD CONSTRAINT `chk_product_batches_quantity_remaining_nonneg` CHECK (`quantity_remaining` >= 0);
ALTER TABLE `product_batches`
    ADD CONSTRAINT `fk_product_batches_po_id` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`po_id`);

-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--                          Business and Prediction Tables
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
DROP TABLE IF EXISTS `operational_costs`;
CREATE TABLE `operational_costs`(
    `cost_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `cost_type` ENUM(
        'RENT',
        'UTILITIES',
        'WAGES',
        'MAINTENANCE',
        'OTHER'
    ) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `cost_date` DATETIME NOT NULL,
    `notes` VARCHAR(255) NULL
);
ALTER TABLE
    `operational_costs` ADD INDEX `operational_costs_cost_date_index`(`cost_date`);
ALTER TABLE
    `operational_costs` COMMENT = 'For calculating total_operating_costs & total_costs (COGS + operating_costs)';

DROP TABLE IF EXISTS `investments`;
CREATE TABLE `investments`(
    `investment_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `amount` DECIMAL(12, 2) NOT NULL,
    `investment_date` DATETIME NOT NULL,
    `description` VARCHAR(255) NULL
);

DROP TABLE IF EXISTS `demand_forecasts`;
CREATE TABLE `demand_forecasts` (
    forecast_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    forecast_date DATE NOT NULL,    
    predicted_demand DECIMAL(12,2) NOT NULL,
    model_name VARCHAR(100) COMMENT 'e.g. ARIMA, LSTM',    
    generated_at DATETIME NOT NULL COMMENT 'when prediction was made',

    FOREIGN KEY (product_id) REFERENCES product(product_id)
);
ALTER TABLE 
    `demand_forecasts` ADD UNIQUE (`product_id`, `forecast_date`, `model_name`);
ALTER TABLE
    `demand_forecasts` ADD INDEX `demand_forecasts_index`(`product_id`, `forecast_date`);


DROP TABLE IF EXISTS `reorder_predictions`;
CREATE TABLE `reorder_predictions` (
    prediction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    current_stock DECIMAL(12,2),
    predicted_reorder_point DECIMAL(12,2),
    recommended_order_qty DECIMAL(12,2),
    model_name VARCHAR(100) COMMENT 'e.g. ARIMA, LSTM',    
    generated_at DATETIME NOT NULL,

    FOREIGN KEY (product_id) REFERENCES product(product_id)
);

DROP TABLE IF EXISTS `profit_predictions`;
CREATE TABLE `profit_predictions` (
    prediction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    predicted_profit DECIMAL(14,2) NOT NULL,
    forecast_date DATE NOT NULL,
    model_name VARCHAR(100),
    generated_at DATETIME NOT NULL,

    FOREIGN KEY (product_id) REFERENCES product(product_id)
);

DROP TABLE IF EXISTS `financial_predictions`;
CREATE TABLE financial_predictions (
    prediction_id BIGINT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    metric_type ENUM('ROI','CAGR', 'NET_PROFIT', 'GROSS_PROFIT') NOT NULL,
    predicted_value DECIMAL(12,4) NOT NULL,
    forecast_date DATE NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    generated_at DATETIME NOT NULL
);
ALTER TABLE 
    `financial_predictions` ADD UNIQUE (metric_type, forecast_date);

DROP TABLE IF EXISTS `roi_break_even_predictions`;
CREATE TABLE `roi_break_even_predictions` (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    investment_id BIGINT NOT NULL,
    predicted_break_even_date DATE NOT NULL,
    investment_amount DECIMAL(14,2) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    generated_at DATETIME NOT NULL
);

DROP TABLE IF EXISTS `ebit_predictions`;
CREATE TABLE `ebit_predictions` (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    forecast_date DATE NOT NULL,
    predicted_ebit DECIMAL(14,2) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    generated_at DATETIME NOT NULL
);

ALTER TABLE
    `product` ADD CONSTRAINT `product_supplier_id_foreign` FOREIGN KEY(`supplier_id`) REFERENCES `supplier`(`supplier_id`);
ALTER TABLE
    `product_batches` ADD UNIQUE `product_batches_barcode_unique`(`barcode`);
ALTER TABLE
    `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_foreign` FOREIGN KEY(`supplier_id`) REFERENCES `supplier`(`supplier_id`);
ALTER TABLE
    `product_category` ADD CONSTRAINT `product_category_parent_category_id_foreign` FOREIGN KEY(`parent_category_id`) REFERENCES `product_category`(`category_id`);
ALTER TABLE
    `purchase_order_items` ADD CONSTRAINT `purchase_order_items_po_id_foreign` FOREIGN KEY(`po_id`) REFERENCES `purchase_orders`(`po_id`);
ALTER TABLE
    `purchase_order_items` ADD CONSTRAINT `purchase_order_items_product_id_foreign` FOREIGN KEY(`product_id`) REFERENCES `product`(`product_id`);
ALTER TABLE
    `product` ADD CONSTRAINT `product_category_id_foreign` FOREIGN KEY(`category_id`) REFERENCES `product_category`(`category_id`);
ALTER TABLE
    `inventory_log` ADD CONSTRAINT `inventory_log_product_id_foreign` FOREIGN KEY(`product_id`) REFERENCES `product`(`product_id`);
ALTER TABLE
    `transaction_items` ADD CONSTRAINT `transaction_items_product_id_foreign` FOREIGN KEY(`product_id`) REFERENCES `product`(`product_id`);
ALTER TABLE
    `transaction_items` ADD CONSTRAINT `transaction_items_transaction_id_foreign` FOREIGN KEY(`transaction_id`) REFERENCES `transaction_log`(`transaction_id`);
ALTER TABLE
    `product_batches` ADD CONSTRAINT `product_batches_product_id_foreign` FOREIGN KEY(`product_id`) REFERENCES `product`(`product_id`);
ALTER TABLE
    `compatibility` ADD CONSTRAINT `compatibility_vehicle_id_foreign` FOREIGN KEY(`vehicle_id`) REFERENCES `vehicles`(`vehicle_id`);
ALTER TABLE
    `compatibility` ADD CONSTRAINT `compatibility_product_id_foreign` FOREIGN KEY(`product_id`) REFERENCES `product`(`product_id`);
ALTER TABLE
    `product_images` ADD CONSTRAINT `product_images_product_id_foreign` FOREIGN KEY(`product_id`) REFERENCES `product`(`product_id`);


-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
-- NOTE: The syntax I will be using for the naming conventions of input variables is:
-- (initial(s) of referenced table)_(optionaly clarifying info)_(referenced row)
-- e.g. v_comp_manufacturer_name = v for the 'vehicle' table, comp for compatible (for clarity), 
-- manufacturer_name is referenced row. 
-- If it's incomprehensible, bother me about it.

-- NOTE: When calling procs that edit table info, only send values that changed.
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--                      Procedures for Acct Management Module:
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--      Register new user (Employee role ONLY)
DROP PROCEDURE IF EXISTS register_user; 

DELIMITER //

CREATE PROCEDURE register_user (
    IN u_username VARCHAR(100),
    IN u_name VARCHAR(100),
    IN u_password_hash VARCHAR(255),
    IN u_role ENUM('ADMIN', 'OWNER', 'SECRETARY', 'EMPLOYEE')
) 
BEGIN
    -- Check if username already exists
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE username = u_username
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Username taken.';
    END IF;

    INSERT INTO users (
		username, 
		name, 
		password_hash, 
		role, 
		created_at
	)
	VALUES (	
		u_username, 
        u_name, 
        u_password_hash, 
        u_role, 
        NOW()
	);
END //

DELIMITER ;

-- Remove existing user (For employee accts ONLY)
DROP PROCEDURE IF EXISTS remove_user; 

DELIMITER //

CREATE PROCEDURE remove_user (
    IN u_user_id BIGINT
)
BEGIN
    -- Check if user exists
    IF NOT EXISTS (
        SELECT 1
        FROM users 
        WHERE user_id = u_user_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User not found';
    END IF;

    DELETE FROM users 
    WHERE user_id = u_user_id;
END //

DELIMITER ;

--      Change information of existing user (use NULL if no change)
DROP PROCEDURE IF EXISTS edit_user; 

DELIMITER //

CREATE PROCEDURE edit_user (
    IN u_user_id BIGINT,
    IN u_username VARCHAR(100),
    IN u_name VARCHAR(100),
    IN u_password_hash VARCHAR(255),
    IN u_role ENUM('ADMIN', 'OWNER', 'SECRETARY', 'EMPLOYEE')
)
BEGIN
    -- Check if user exists
    IF NOT EXISTS (
        SELECT 1
        FROM users
        WHERE user_id = u_user_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User not found';
    END IF;

    UPDATE user
    SET
        username = COALESCE(u_username, username),
        name = COALESCE(u_name, name),
        password_hash = COALESCE(u_password_hash, password_hash),
        role = COALESCE(u_role, role), -- needed a comma
        last_update = NOW()
    WHERE user_id = u_user_id;

END //

DELIMITER ;

--      View user credentials (Admin & Owner ONLY can use this)
DROP PROCEDURE IF EXISTS view_user_details; 

DELIMITER //

CREATE PROCEDURE view_user_details (
    OUT user_id BIGINT
)
BEGIN
    SELECT
        u.name,
        u.username,
        u.password_hash,    -- Use java to show unhashed pw
        u.role
    FROM users u
    GROUP BY u.role
    ORDER BY u.name;
END //

DELIMITER ;

-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--                          Procedures for Inventory Module: 
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--      Add new product record to Main Data Tables 
DROP PROCEDURE IF EXISTS add_product; 
DELIMITER //

CREATE PROCEDURE add_product (
    IN p_name VARCHAR(255),
    IN p_description VARCHAR(255),
    IN p_part_number VARCHAR(200),
    IN i_image_path VARCHAR(255),
    IN c_category_name VARCHAR(255),
    IN s_supplier_name VARCHAR(255),
    IN p_location VARCHAR(255),
    IN p_unit_cost DECIMAL(12,2),
    IN p_retail_price DECIMAL(12,2),
    IN v_comp_manufacturer_name VARCHAR(255),
    IN v_comp_model_name VARCHAR(255),
    IN co_comp_bottom_year SMALLINT,
    IN co_comp_top_year SMALLINT
)
BEGIN
    DECLARE c_category_id, s_supplier_id, v_vehicle_id, v_manufacturer_id SMALLINT;

    -- Validate categorical data exists
    SELECT category_id INTO c_category_id
    FROM product_category
    WHERE LOWER(category_name) = LOWER(c_category_name)
    LIMIT 1;

    SELECT supplier_id INTO s_supplier_id
    FROM supplier
    WHERE LOWER(supplier_name) = LOWER(s_supplier_name)
    LIMIT 1;

    SELECT manufacturer_id INTO v_manufacturer_id
    FROM manufacturers
    WHERE LOWER(manufacturer_name) = LOWER(v_comp_manufacturer_name)
    LIMIT 1;

    SELECT vehicle_id INTO v_vehicle_id
    FROM vehicles
    WHERE LOWER(model_name) = LOWER(v_comp_model_name)
    AND manufacturer_id = v_manufacturer_id
    LIMIT 1;

    IF c_category_id IS NULL THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid category_id';
    END IF;

    IF s_supplier_id IS NULL THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid s_supplier_id';
    END IF;

    IF v_vehicle_id IS NULL THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid v_vehicle_id';
    END IF;

    IF v_manufacturer_id IS NULL THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid manufacturer_id';
    END IF;

    INSERT INTO product (
        product_name,
        product_description,
        part_number,
        category_id,
        supplier_id,
        storage_location,
        last_update,
        unit_cost,
        retail_price
    )
    VALUES (
        p_name,
        p_description,
        p_part_number,
        c_category_id,
        s_supplier_id,
        p_location,
        NOW(),
        p_unit_cost,
        p_retail_price
    );

    -- Take the auto assigned product id for use in following insert statements
    SET @p_product_id = (SELECT last_insert_id());

    INSERT INTO product_images (
        product_id,
        image_path,
        date_uploaded
    )
    VALUES (
        @p_product_id,
        i_image_path,
        NOW()
    );

    INSERT INTO compatibility (
        product_id,
        bottom_year,
        top_year,
        vehicle_id
    )
    VALUES (
        @p_product_id,
        co_comp_bottom_year,
        co_comp_top_year,
        v_vehicle_id
    );
END //

DELIMITER ;

--      Edit information of product record in Main Data Tables 
DROP PROCEDURE IF EXISTS edit_product; 
DELIMITER //

CREATE PROCEDURE edit_product (
    IN p_product_id INT,
    IN p_name VARCHAR(255),
    IN p_description VARCHAR(255),
    IN p_part_number VARCHAR(200),    
    IN i_image_path VARCHAR(255),
    IN c_category_id SMALLINT,
    IN c_category_name VARCHAR(255),
    IN s_supplier_id SMALLINT,
    IN s_supplier_name VARCHAR(255),
    IN p_location VARCHAR(255),
    IN p_unit_cost DECIMAL(12,2),
    IN p_retail_price DECIMAL(12,2),
    IN v_comp_manufacturer_name VARCHAR(255),
    IN v_comp_vehicle_id SMALLINT,
    IN v_comp_model_name VARCHAR(255),
    IN co_comp_bottom_year SMALLINT,
    IN co_comp_top_year SMALLINT
)
BEGIN
    DECLARE v_manufacturer_id SMALLINT;

    -- Check if product exists
    IF NOT EXISTS (
        SELECT 1
        FROM product
        WHERE product_id = p_product_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Product not found';
    END IF;

    -- Check if category exists
    IF c_category_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM product_category WHERE category_id = c_category_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid category_id';
    END IF;

    -- Check if supplier exists
    IF s_supplier_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM supplier WHERE supplier_id = s_supplier_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid supplier_id';
    END IF;

    -- Get manufacturer_id if provided
    IF v_comp_manufacturer_name IS NOT NULL THEN
        SELECT manufacturer_id INTO v_manufacturer_id
        FROM manufacturers
        WHERE LOWER(manufacturer_name) = LOWER(v_comp_manufacturer_name)
        LIMIT 1;

        IF v_manufacturer_id IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid manufacturer';
        END IF;
    END IF;

    -- Validate vehicle using manufacturer + model
    IF v_comp_model_name IS NOT NULL THEN
        SELECT vehicle_id INTO v_comp_vehicle_id
        FROM vehicles
        WHERE LOWER(model_name) = LOWER(v_comp_model_name)
        AND manufacturer_id = v_manufacturer_id
        LIMIT 1;

        IF v_comp_vehicle_id IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid vehicle for given manufacturer';
        END IF;
    END IF;

    -- Update info
    UPDATE product
    SET
        product_name = COALESCE(p_name, product_name),
        product_description = COALESCE(p_description, product_description),
        part_number = COALESCE(p_part_number, part_number),
        category_id = COALESCE(c_category_id, category_id),
        supplier_id = COALESCE(s_supplier_id, supplier_id),
        storage_location = COALESCE(p_location, storage_location),
        last_update = NOW(),
        unit_cost = COALESCE(p_unit_cost, unit_cost),
        retail_price = COALESCE(p_retail_price, retail_price)
    WHERE product_id = p_product_id;

    UPDATE product_images
    SET
        image_path = COALESCE(i_image_path, image_path),
        date_uploaded = NOW()
    WHERE product_id = p_product_id;

    -- Update compatibility 
    IF v_comp_vehicle_id IS NOT NULL THEN
        UPDATE compatibility
        SET
            vehicle_id = v_comp_vehicle_id,
            bottom_year = COALESCE(co_comp_bottom_year, bottom_year),
            top_year = COALESCE(co_comp_top_year, top_year)
        WHERE product_id = p_product_id;
    END IF;

END //

DELIMITER ;

--      Add new product category
DROP PROCEDURE IF EXISTS add_product_category; 

DELIMITER //

CREATE PROCEDURE add_product_category (
    IN c_category_name VARCHAR(255),
    IN c_parent_category_id VARCHAR(255)
) 
BEGIN
    INSERT INTO product_category (
        category_name,
        parent_category_id,
        date_added
    ) VALUES (
        c_category_name,
        c_parent_category_id,
        NOW()
    );
END //

DELIMITER ;

--      Add new supplier
DROP PROCEDURE IF EXISTS add_supplier; 

DELIMITER //

CREATE PROCEDURE add_supplier (
    IN s_supplier_name VARCHAR(255),
    IN s_supplier_address VARCHAR(255),
    IN s_supplier_contact BIGINT
) 
BEGIN
    INSERT INTO supplier (
        supplier_name,
        supplier_address,
        supplier_contact,
        date_added,
        last_update
    ) VALUES (
        s_supplier_name,
        s_supplier_address,
        s_supplier_contact,
        NOW(),
        NOW()
    );
END //

DELIMITER ;

--      Add new vehicle
DROP PROCEDURE IF EXISTS add_vehicle; 

DELIMITER //

CREATE PROCEDURE add_vehicle (
    IN v_model_name VARCHAR(255),
    IN v_manufacturer_name VARCHAR(255)
) 
BEGIN
    DECLARE v_manufacturer_id SMALLINT;
    
    -- Get manufacturer_id
    SELECT manufacturer_id INTO v_manufacturer_id
    FROM manufacturers
    WHERE LOWER(manufacturer_name) = LOWER(v_manufacturer_name)
    LIMIT 1;

    IF v_manufacturer_id IS NULL THEN
        INSERT INTO manufacturers (manufacturer_name)
        VALUES (v_manufacturer_name);

        SET v_manufacturer_id = LAST_INSERT_ID();
    END IF;

    IF EXISTS (
        SELECT 1 FROM vehicles
        WHERE LOWER(model_name) = LOWER(v_model_name)
        AND manufacturer_id = v_manufacturer_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Vehicle already exists for this manufacturer';
    END IF;

    INSERT INTO vehicles (
        model_name,
        manufacturer_id
    ) VALUES (
        v_model_name,
        v_manufacturer_id
    );
END //

DELIMITER ;

--      Add/edit image to product
DROP PROCEDURE IF EXISTS add_or_update_product_image;
DELIMITER //

CREATE PROCEDURE add_or_update_product_image (
    IN p_product_id INT,
    IN p_image_path VARCHAR(255)
)
BEGIN
    DECLARE existing_count INT;

    -- Check if product exists
    IF NOT EXISTS (
        SELECT 1 FROM product WHERE product_id = p_product_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid product_id';
    END IF;

    -- Check if image already exists
    SELECT COUNT(*) INTO existing_count
    FROM product_images
    WHERE product_id = p_product_id;

    IF existing_count > 0 THEN
        -- Replace existing image
        UPDATE product_images
        SET image_path = p_image_path,
            date_uploaded = NOW()
        WHERE product_id = p_product_id;
    ELSE
        -- Insert new image
        INSERT INTO product_images (
            product_id,
            image_path,
            date_uploaded
        ) VALUES (
            p_product_id,
            p_image_path,
            NOW()
        );
    END IF;
END //

DELIMITER ;

--      Remove selected existing product record(s) from Main Data Tables
DROP PROCEDURE IF EXISTS remove_product;
DELIMITER //

CREATE PROCEDURE remove_product (
    IN p_product_id INT
)
BEGIN
    DECLARE v_exists INT;
    DECLARE v_has_stock INT;
    DECLARE v_used_in_transactions INT;

    START TRANSACTION;

    -- Check if product exists
    SELECT COUNT(*) INTO v_exists
    FROM product
    WHERE product_id = p_product_id;

    IF v_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Product does not exist';
    END IF;

    -- Check if product still has stock IN BATCHES ONLY
    SELECT COUNT(*) INTO v_has_stock
    FROM product_batches
    WHERE product_id = p_product_id
      AND quantity_remaining > 0;

    IF v_has_stock > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot remove product with remaining stock';
    END IF;

    -- Check if used in transactions
    SELECT COUNT(*) INTO v_used_in_transactions
    FROM transaction_items
    WHERE product_id = p_product_id;

    -- If used, soft delete
    IF v_used_in_transactions > 0 THEN

        UPDATE product
        SET status = 'INACTIVE',
            last_update = NOW()
        WHERE product_id = p_product_id;

    ELSE
        -- If never used, hard delete

        DELETE FROM product_images
        WHERE product_id = p_product_id;

        DELETE FROM compatibility
        WHERE product_id = p_product_id;

        DELETE FROM product
        WHERE product_id = p_product_id;

    END IF;

    COMMIT;

END //

DELIMITER ;

--      Edit product category
DROP PROCEDURE IF EXISTS update_product_category;
DELIMITER //

CREATE PROCEDURE update_product_category (
    IN p_category_id SMALLINT,
    IN p_category_name VARCHAR(255),
    IN p_parent_category_id SMALLINT
)
BEGIN
    -- Validate existence
    IF NOT EXISTS (
        SELECT 1 FROM product_category WHERE category_id = p_category_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Category not found';
    END IF;

    UPDATE product_category
    SET
        category_name = COALESCE(p_category_name, category_name),
        parent_category_id = COALESCE(p_parent_category_id, parent_category_id)
    WHERE category_id = p_category_id;

END //

DELIMITER ;

--      Edit supplier
DROP PROCEDURE IF EXISTS update_supplier;
DELIMITER //

CREATE PROCEDURE update_supplier (
    IN p_supplier_id SMALLINT,
    IN p_supplier_name VARCHAR(255),
    IN p_supplier_address VARCHAR(255),
    IN p_supplier_contact BIGINT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM supplier WHERE supplier_id = p_supplier_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Supplier not found';
    END IF;

    UPDATE supplier
    SET
        supplier_name = COALESCE(p_supplier_name, supplier_name),
        supplier_address = COALESCE(p_supplier_address, supplier_address),
        supplier_contact = COALESCE(p_supplier_contact, supplier_contact),
        last_update = NOW()
    WHERE supplier_id = p_supplier_id;

END //

DELIMITER ;

--      Edit vehicle
DROP PROCEDURE IF EXISTS update_vehicle;
DELIMITER //

CREATE PROCEDURE update_vehicle (
    IN p_vehicle_id SMALLINT,
    IN p_model_name VARCHAR(255),
    IN p_manufacturer_name VARCHAR(255)
)
BEGIN
    DECLARE v_manufacturer_id SMALLINT;

    IF p_manufacturer_name IS NOT NULL THEN
        SELECT manufacturer_id INTO v_manufacturer_id
        FROM manufacturers
        WHERE LOWER(manufacturer_name) = LOWER(p_manufacturer_name)
        LIMIT 1;

        IF v_manufacturer_id IS NULL THEN
            INSERT INTO manufacturers (manufacturer_name)
            VALUES (p_manufacturer_name);

            SET v_manufacturer_id = LAST_INSERT_ID();
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM vehicles WHERE vehicle_id = p_vehicle_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Vehicle not found';
    END IF;

    UPDATE vehicles
    SET
        model_name = COALESCE(p_model_name, model_name),
        manufacturer_id = COALESCE(v_manufacturer_id, manufacturer_id)
    WHERE vehicle_id = p_vehicle_id;
END //

DELIMITER ;

--      Remove existing product category
DROP PROCEDURE IF EXISTS delete_product_category;
DELIMITER //

CREATE PROCEDURE delete_product_category (
    IN p_category_id SMALLINT
)
BEGIN
    -- Check if used by products
    IF EXISTS (
        SELECT 1 FROM product WHERE category_id = p_category_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Category is in use by products';
    END IF;

    -- Check if has child categories
    IF EXISTS (
        SELECT 1 FROM product_category WHERE parent_category_id = p_category_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Category has child categories';
    END IF;

    DELETE FROM product_category
    WHERE category_id = p_category_id;

END //

DELIMITER ;

--      Remove existing supplier
DROP PROCEDURE IF EXISTS delete_supplier;
DELIMITER //

CREATE PROCEDURE delete_supplier (
    IN p_supplier_id SMALLINT
)
BEGIN
    -- Check product dependency
    IF EXISTS (
        SELECT 1 FROM product WHERE supplier_id = p_supplier_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Supplier is linked to products';
    END IF;

    -- Check ordpurchase ers
    IF EXISTS (
        SELECT 1 FROM purchase_orders WHERE supplier_id = p_supplier_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Supplier has purchase orders';
    END IF;

    DELETE FROM supplier
    WHERE supplier_id = p_supplier_id;

END //

DELIMITER ;

--      Remove existing vehicle
DROP PROCEDURE IF EXISTS delete_vehicle;
DELIMITER //

CREATE PROCEDURE delete_vehicle (
    IN p_vehicle_id SMALLINT
)
BEGIN
    -- Check compatibility usage
    IF EXISTS (
        SELECT 1 FROM compatibility WHERE vehicle_id = p_vehicle_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Vehicle is used in compatibility table';
    END IF;

    DELETE FROM vehicles
    WHERE vehicle_id = p_vehicle_id;

END //

DELIMITER ;

-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
-- Procedures for Point of Sale Module:
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--      Add new pending transaction 
DROP PROCEDURE IF EXISTS add_pending_transaction; 

DELIMITER //

CREATE PROCEDURE add_pending_transaction (
    IN tl_receipt_num INT,
    IN tl_total_amount DECIMAL(12, 2),
    IN tl_payment_method ENUM('CASH', 'E-WALLET', 'BANK'),
    IN tl_notes VARCHAR(255)
) 
BEGIN
    INSERT INTO pending_transactions_log (
        transaction_date,
        receipt_num,
        total_amount,
        payment_method,
        status,
        notes
    ) VALUES (
        NOW(),
        tl_receipt_num,
        tl_total_amount,        
        tl_payment_method,
        'PENDING',
        tl_notes
    );
END //

DELIMITER ;

--      Cancel pending transaction 
DROP PROCEDURE IF EXISTS cancel_pending_transaction; 

DELIMITER //

CREATE PROCEDURE cancel_pending_transaction (
    IN tl_transaction_id BIGINT
) 
BEGIN
UPDATE transaction_log
SET 
    status = 'CANCELLED',
    transaction_date = NOW()
WHERE transaction_id = tl_transaction_id;
END //

DELIMITER ;

--      Confirm transaction
DROP PROCEDURE IF EXISTS confirm_transaction;
DELIMITER //

CREATE PROCEDURE confirm_transaction (
    IN p_transaction_id BIGINT,
    IN p_payment_method ENUM('CASH','E-WALLET','BANK'),
    IN p_receipt_num INT
)
BEGIN
    DECLARE done INT DEFAULT 0;

    DECLARE v_product_id INT;
    DECLARE v_batch_id BIGINT;
    DECLARE v_quantity SMALLINT;
    DECLARE v_unit_cost DECIMAL(12,2);
    DECLARE v_remaining SMALLINT;

    DECLARE cur_items CURSOR FOR
        SELECT 
            product_id,
            batch_id,
            quantity_sold,
            unit_cost_at_sale
        FROM transaction_items
        WHERE transaction_id = p_transaction_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    START TRANSACTION;

    -- Lock transaction
    IF NOT EXISTS (
        SELECT 1 FROM transaction_log
        WHERE transaction_id = p_transaction_id
          AND status = 'PENDING'
        FOR UPDATE
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction is not in PENDING state';
    END IF;

    -- Validate ALL stock first (NO partial deductions)
    IF EXISTS (
        SELECT 1
        FROM transaction_items ti
        JOIN product_batches pb 
            ON ti.batch_id = pb.batch_id
        WHERE ti.transaction_id = p_transaction_id
          AND pb.quantity_remaining < ti.quantity_sold
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock in one or more batches';
    END IF;

    -- Process items
    OPEN cur_items;

    read_loop: LOOP
        FETCH cur_items INTO 
            v_product_id,
            v_batch_id,
            v_quantity,
            v_unit_cost;

        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Lock batch row BEFORE update
        SELECT quantity_remaining INTO v_remaining
        FROM product_batches
        WHERE batch_id = v_batch_id
        FOR UPDATE;

        IF v_remaining < v_quantity THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Stock changed during transaction (retry)';
        END IF;

        -- Deduct from batch
        UPDATE product_batches
        SET quantity_remaining = quantity_remaining - v_quantity
        WHERE batch_id = v_batch_id;

        -- Log inventory movement
        INSERT INTO inventory_log (
            product_id,
            change_type,
            quantity,
            unit_cost,
            log_date,
            reference_id,
            reference_type
        ) VALUES (
            v_product_id,
            'OUT',
            v_quantity,
            v_unit_cost,
            NOW(),
            p_transaction_id,
            'TRANSACTION'
        );

    END LOOP;

    CLOSE cur_items;

    -- Final total recalc 
    UPDATE transaction_log
    SET total_amount = (
        SELECT IFNULL(SUM(total_sale_value), 0)
        FROM transaction_items
        WHERE transaction_id = p_transaction_id
    )
    WHERE transaction_id = p_transaction_id;

    -- Finalize transaction
    UPDATE transaction_log
    SET 
        status = 'CONFIRMED',
        payment_method = p_payment_method,
        receipt_num = p_receipt_num,
        transaction_date = NOW()
    WHERE transaction_id = p_transaction_id;

    COMMIT;

END //

DELIMITER ;

--      Set transaction to refunded
DROP PROCEDURE IF EXISTS refund_transaction;
DELIMITER //

CREATE PROCEDURE refund_transaction (
    IN tl_original_transaction_id BIGINT
) 
BEGIN
    DECLARE var_new_transaction_id BIGINT;
    DECLARE var_receipt_num INT;
    DECLARE var_total_amount DECIMAL(12,2);

    -- Cursor variables
    DECLARE done INT DEFAULT 0;

    DECLARE var_product_id INT;
    DECLARE var_batch_id BIGINT;
    DECLARE var_quantity SMALLINT;
    DECLARE var_unit_price DECIMAL(12,2);
    DECLARE var_unit_cost DECIMAL(12,2);
    DECLARE var_discount DECIMAL(12,2);

    DECLARE cur_items CURSOR FOR
        SELECT 
            product_id,
            batch_id,
            quantity_sold,
            unit_selling_price,
            unit_cost_at_sale,
            discount_applied
        FROM transaction_items
        WHERE transaction_id = tl_original_transaction_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    START TRANSACTION;

    -- Validate transaction
    IF NOT EXISTS (
        SELECT 1 FROM transaction_log
        WHERE transaction_id = tl_original_transaction_id
          AND status = 'CONFIRMED'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid or already confirmed transaction';
    END IF;

    IF EXISTS (
        SELECT 1 FROM transaction_log
        WHERE parent_transaction_id = tl_original_transaction_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction already refunded';
    END IF;

    -- Create refund transaction
    INSERT INTO transaction_log (
        transaction_date,
        receipt_num,
        total_amount,
        payment_method,
        status,
        parent_transaction_id,
        notes
    )
    SELECT
        NOW(),
        NULL,
        0,
        payment_method,
        'REFUNDED',
        transaction_id,
        CONCAT('Refund for transaction ', transaction_id)
    FROM transaction_log
    WHERE transaction_id = tl_original_transaction_id;

    SET var_new_transaction_id = LAST_INSERT_ID();

    -- Copy items as negative values
    OPEN cur_items;

    read_loop: LOOP
        FETCH cur_items INTO
            var_product_id,
            var_batch_id,
            var_quantity,
            var_unit_price,
            var_unit_cost,
            var_discount;

        IF done THEN
            LEAVE read_loop;
        END IF;

        INSERT INTO transaction_items (
            transaction_id,
            product_id,
            batch_id,
            quantity_sold,
            unit_selling_price,
            unit_cost_at_sale,
            discount_applied,
            total_sale_value,
            total_cost
        ) VALUES (
            var_new_transaction_id,
            var_product_id,
            var_batch_id,
            -var_quantity,  
            var_unit_price,
            var_unit_cost,
            var_discount,
            -(var_quantity * var_unit_price - var_quantity * var_discount),
            -(var_quantity * var_unit_cost)
        );

        -- Restore inventory
        INSERT INTO inventory_log (
            product_id,
            change_type,
            quantity,
            unit_cost,
            log_date,
            reference_id,
            reference_type
        ) VALUES (
            var_product_id,
            'IN', 
            var_quantity,
            var_unit_cost,
            NOW(),
            var_new_transaction_id,
            'TRANSACTION'
        );

    END LOOP;

    CLOSE cur_items;

    -- Update total_amount of refund transaction
    SELECT IFNULL(SUM(total_sale_value), 0)
    INTO var_total_amount
    FROM transaction_items
    WHERE transaction_id = var_new_transaction_id;

    UPDATE transaction_log
    SET total_amount = var_total_amount
    WHERE transaction_id = var_new_transaction_id;

    COMMIT;
END //

DELIMITER ;

--      Add selected items to transaction, update inv log (stock out)
DROP PROCEDURE IF EXISTS add_item_to_transaction;
DELIMITER //

CREATE PROCEDURE add_item_to_transaction (
    IN p_transaction_id BIGINT,
    IN p_product_id INT,
    IN p_batch_id BIGINT,
    IN p_quantity SMALLINT,
    IN p_unit_price DECIMAL(12,2),
    IN p_discount DECIMAL(12,2)
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_stock SMALLINT;
    DECLARE v_unit_cost DECIMAL(12,2);
    DECLARE v_existing_qty SMALLINT DEFAULT 0;

    START TRANSACTION;

    -- Lock transaction row
    SELECT status INTO v_status
    FROM transaction_log
    WHERE transaction_id = p_transaction_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction not found';
    END IF;

    IF v_status != 'PENDING' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction is not editable';
    END IF;

    -- Lock batch row 
    SELECT quantity_remaining, unit_cost
    INTO v_stock, v_unit_cost
    FROM product_batches
    WHERE batch_id = p_batch_id
      AND product_id = p_product_id
    FOR UPDATE;

    IF v_stock IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid product or batch';
    END IF;

    -- Check if item already exists
    SELECT quantity_sold INTO v_existing_qty
    FROM transaction_items
    WHERE transaction_id = p_transaction_id
      AND product_id = p_product_id
      AND batch_id = p_batch_id
    LIMIT 1;

    IF v_existing_qty IS NULL THEN
        SET v_existing_qty = 0;
    END IF;

    -- Validate stock (existing + new)
    IF v_stock < (v_existing_qty + p_quantity) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock for requested quantity';
    END IF;

    -- UPSERT logic
    IF v_existing_qty > 0 THEN

        UPDATE transaction_items
        SET 
            quantity_sold = v_existing_qty + p_quantity,
            unit_selling_price = p_unit_price,
            discount_applied = p_discount,
            total_sale_value = 
                ((v_existing_qty + p_quantity) * p_unit_price) -
                ((v_existing_qty + p_quantity) * p_discount),
            total_cost = 
                (v_existing_qty + p_quantity) * v_unit_cost
        WHERE transaction_id = p_transaction_id
          AND product_id = p_product_id
          AND batch_id = p_batch_id;

    ELSE

        INSERT INTO transaction_items (
            transaction_id,
            product_id,
            batch_id,
            quantity_sold,
            unit_selling_price,
            unit_cost_at_sale,
            discount_applied,
            total_sale_value,
            total_cost
        ) VALUES (
            p_transaction_id,
            p_product_id,
            p_batch_id,
            p_quantity,
            p_unit_price,
            v_unit_cost,
            p_discount,
            (p_quantity * p_unit_price) - (p_quantity * p_discount),
            p_quantity * v_unit_cost
        );

    END IF;

    -- Recalculate transaction total
    UPDATE transaction_log
    SET total_amount = (
        SELECT IFNULL(SUM(total_sale_value), 0)
        FROM transaction_items
        WHERE transaction_id = p_transaction_id
    )
    WHERE transaction_id = p_transaction_id;

    COMMIT;

END //

DELIMITER ;

--      Remove selected items from transaction, update inv log (stock out)
DROP PROCEDURE IF EXISTS remove_item_from_transaction;
DELIMITER //

CREATE PROCEDURE remove_item_from_transaction (
    IN p_transaction_id BIGINT,
    IN p_product_id INT,
    IN p_batch_id BIGINT,
    IN p_quantity SMALLINT
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_current_qty SMALLINT;
    DECLARE v_unit_price DECIMAL(12,2);
    DECLARE v_discount DECIMAL(12,2);
    DECLARE v_unit_cost DECIMAL(12,2);

    -- Validate transaction
    SELECT status INTO v_status
    FROM transaction_log
    WHERE transaction_id = p_transaction_id;

    IF v_status != 'PENDING' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction is not editable';
    END IF;

    -- Get current item
    SELECT quantity_sold, unit_selling_price, discount_applied, unit_cost_at_sale
    INTO v_current_qty, v_unit_price, v_discount, v_unit_cost
    FROM transaction_items
    WHERE transaction_id = p_transaction_id
      AND product_id = p_product_id
      AND batch_id = p_batch_id;

    IF v_current_qty IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Item not found in transaction';
    END IF;

    -- Remove or reduce
    IF p_quantity >= v_current_qty THEN

        DELETE FROM transaction_items
        WHERE transaction_id = p_transaction_id
          AND product_id = p_product_id
          AND batch_id = p_batch_id;

    ELSE

        UPDATE transaction_items
        SET 
            quantity_sold = v_current_qty - p_quantity,
            total_sale_value = 
                ((v_current_qty - p_quantity) * v_unit_price) -
                ((v_current_qty - p_quantity) * v_discount),
            total_cost = 
                (v_current_qty - p_quantity) * v_unit_cost
        WHERE transaction_id = p_transaction_id
          AND product_id = p_product_id
          AND batch_id = p_batch_id;

    END IF;

    -- Update transaction total
    UPDATE transaction_log
    SET total_amount = (
        SELECT IFNULL(SUM(total_sale_value), 0)
        FROM transaction_items
        WHERE transaction_id = p_transaction_id
    )
    WHERE transaction_id = p_transaction_id;

END //

DELIMITER ;

--      Fetch transaction details to display on screen
DROP PROCEDURE IF EXISTS get_transaction_history;
DELIMITER //

CREATE PROCEDURE get_transaction_history (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_status VARCHAR(20),
    IN p_product_id INT,
    IN p_category_id SMALLINT,
    IN p_payment_method VARCHAR(20),
    IN p_search VARCHAR(255),
    IN p_sort_by VARCHAR(20), -- 'date', 'amount'
    IN p_limit INT,
    IN p_offset INT
)
BEGIN

    SELECT
        t.transaction_id,
        t.transaction_date,
        t.receipt_num,
        t.payment_method,
        t.total_amount,
        t.status,

        -- computed fields
        IFNULL(SUM(ti.total_cost), 0) AS total_cost,
        (t.total_amount - IFNULL(SUM(ti.total_cost), 0)) AS profit,

        COUNT(DISTINCT ti.item_id) AS total_items

    FROM transaction_log t

    LEFT JOIN transaction_items ti 
        ON t.transaction_id = ti.transaction_id

    LEFT JOIN product p 
        ON ti.product_id = p.product_id

    LEFT JOIN product_category pc
        ON p.category_id = pc.category_id

    # Filters
    WHERE
        (p_start_date IS NULL OR t.transaction_date >= p_start_date)
        AND (p_end_date IS NULL OR t.transaction_date <= p_end_date)
        AND (p_status IS NULL OR t.status = p_status)
        AND (p_payment_method IS NULL OR t.payment_method = p_payment_method)
        AND (
            p_product_id IS NULL 
            OR EXISTS (
                SELECT 1
                FROM transaction_items ti2
                WHERE ti2.transaction_id = t.transaction_id
                  AND ti2.product_id = p_product_id
            )
        )
        AND (
            p_category_id IS NULL
            OR EXISTS (
                SELECT 1
                FROM transaction_items ti3
                JOIN product p3 ON ti3.product_id = p3.product_id
                WHERE ti3.transaction_id = t.transaction_id
                  AND p3.category_id = p_category_id
            )
        )
        AND (
            p_search IS NULL
            OR EXISTS (
                SELECT 1
                FROM transaction_items ti4
                JOIN product p4 ON ti4.product_id = p4.product_id
                WHERE ti4.transaction_id = t.transaction_id
                  AND LOWER(p4.product_name) LIKE CONCAT('%', LOWER(p_search), '%')
            )
        )

    GROUP BY 
        t.transaction_id,
        t.transaction_date,
        t.receipt_num,
        t.payment_method,
        t.total_amount,
        t.status

    ORDER BY
        CASE 
            WHEN p_sort_by = 'amount' THEN t.total_amount
            ELSE t.transaction_date
        END DESC

    LIMIT p_limit OFFSET p_offset;
END //

DELIMITER ;

-- Fetch detailed transaction information
DROP PROCEDURE IF EXISTS get_transaction_details;
DELIMITER //

CREATE PROCEDURE get_transaction_details (
    IN p_transaction_id BIGINT
)
BEGIN

    SELECT
        ti.item_id,
        p.product_name,
        ti.quantity_sold,
        ti.unit_selling_price,
        ti.discount_applied,
        ti.total_sale_value,
        ti.total_cost
    FROM transaction_items ti
    JOIN product p ON ti.product_id = p.product_id
    WHERE ti.transaction_id = p_transaction_id;

END //

DELIMITER ;

-- Transaction Log Dashboard Proc
DROP PROCEDURE IF EXISTS get_transaction_dashboard;    
DELIMITER //

CREATE PROCEDURE get_transaction_dashboard ()
BEGIN
    DECLARE v_today_start DATETIME;
    DECLARE v_today_end DATETIME;
    DECLARE v_yesterday_start DATETIME;
    DECLARE v_yesterday_end DATETIME;
    DECLARE v_week_start DATETIME;

    SET v_today_start = CURDATE();
    SET v_today_end = NOW();

    SET v_yesterday_start = CURDATE() - INTERVAL 1 DAY;
    SET v_yesterday_end = CURDATE();

    SET v_week_start = CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY;

    -- Daily KPIs
    SELECT
        IFNULL(SUM(t.total_amount), 0) AS total_sales,
        COUNT(t.transaction_id) AS total_transactions,
        IFNULL(AVG(t.total_amount), 0) AS avg_sale
    FROM transaction_log t
    WHERE t.status = 'CONFIRMED'
      AND t.transaction_date BETWEEN v_today_start AND v_today_end;

    -- Trend
    SELECT
        today.total_sales,
        yesterday.total_sales AS prev_sales,
        (today.total_sales - yesterday.total_sales) AS sales_diff,

        today.total_transactions,
        yesterday.total_transactions AS prev_transactions,
        (today.total_transactions - yesterday.total_transactions) AS transactions_diff,

        today.avg_sale,
        yesterday.avg_sale AS prev_avg_sale,
        (today.avg_sale - yesterday.avg_sale) AS avg_sale_diff

    FROM
    (
        SELECT
            IFNULL(SUM(total_amount), 0) AS total_sales,
            COUNT(*) AS total_transactions,
            IFNULL(AVG(total_amount), 0) AS avg_sale
        FROM transaction_log
        WHERE status = 'CONFIRMED'
            AND transaction_date BETWEEN v_today_start AND v_today_end
    ) today,

    (
        SELECT
            IFNULL(SUM(total_amount), 0) AS total_sales,
            COUNT(*) AS total_transactions,
            IFNULL(AVG(total_amount), 0) AS avg_sale
        FROM transaction_log
        WHERE status = 'CONFIRMED'
            AND transaction_date BETWEEN v_yesterday_start AND v_yesterday_end
    ) yesterday;

    -- Top 3 products today
    SELECT
        p.product_id,
        p.product_name,
        SUM(ti.quantity_sold) AS total_quantity,
        SUM(ti.total_sale_value) AS total_sales
    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    JOIN product p ON ti.product_id = p.product_id
    WHERE t.status = 'CONFIRMED'
        AND t.transaction_date BETWEEN v_today_start AND v_today_end
    GROUP BY p.product_id
    ORDER BY total_quantity DESC
    LIMIT 3;

    -- Top 3 products this week
    SELECT
        p.product_id,
        p.product_name,
        SUM(ti.quantity_sold) AS total_quantity,
        SUM(ti.total_sale_value) AS total_sales
    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    JOIN product p ON ti.product_id = p.product_id
    WHERE t.status = 'CONFIRMED'
        AND t.transaction_date BETWEEN v_week_start AND v_today_end
    GROUP BY p.product_id
    ORDER BY total_quantity DESC
    LIMIT 3;

    -- Categorical sales today
    SELECT
        pc.category_id,
        pc.category_name,
        SUM(ti.total_sale_value) AS total_sales
    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    JOIN product p ON ti.product_id = p.product_id
    JOIN product_category pc ON p.category_id = pc.category_id
    WHERE t.status = 'CONFIRMED'
        AND t.transaction_date BETWEEN v_today_start AND v_today_end
    GROUP BY pc.category_id
    ORDER BY total_sales DESC;

    -- Categorical sales this week
    SELECT
        pc.category_id,
        pc.category_name,
        SUM(ti.total_sale_value) AS total_sales
    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    JOIN product p ON ti.product_id = p.product_id
    JOIN product_category pc ON p.category_id = pc.category_id
    WHERE t.status = 'CONFIRMED'
        AND t.transaction_date BETWEEN v_week_start AND v_today_end
    GROUP BY pc.category_id
    ORDER BY total_sales DESC;

END //

DELIMITER ;

-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--              Procedures for Business Analytics & Predictive AI
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--      Create training dataset for Demand Forecasting (time series per product)
DROP PROCEDURE IF EXISTS dataset_sales_timeseries; 

DELIMITER //

CREATE PROCEDURE dataset_sales_timeseries (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME,
    IN p_mode ENUM('PRODUCT', 'CATEGORY')
)
BEGIN
    SELECT 
        CASE 
            WHEN p_mode = 'CATEGORY' THEN pc.category_id
            ELSE p.product_id
        END AS entity_id,

        CASE 
            WHEN p_mode = 'CATEGORY' THEN pc.category_name
            ELSE p.product_name
        END AS entity_name,

        DATE(t.transaction_date) AS sale_date,
        SUM(ti.quantity_sold) AS total_quantity

    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    JOIN product p ON ti.product_id = p.product_id
    JOIN product_category pc ON p.category_id = pc.category_id

    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'CONFIRMED'

    GROUP BY entity_id, DATE(t.transaction_date)
    ORDER BY entity_id, sale_date;
END //

DELIMITER ;

--      Create training dataset for Reorder Prediction (stock + demand features)
DROP PROCEDURE IF EXISTS dataset_reorder; 

DELIMITER //

CREATE PROCEDURE dataset_reorder (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    SELECT 
        p.product_id,
        p.product_name,

        DATE(t.transaction_date) AS sale_date,

        SUM(ti.quantity_sold) AS daily_demand,

        -- p.current_stock_level,

        AVG(ti.unit_cost_at_sale) AS avg_cost

    FROM transaction_items ti
    JOIN transaction_log t 
        ON ti.transaction_id = t.transaction_id
    JOIN product p 
        ON ti.product_id = p.product_id

    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'CONFIRMED'

    GROUP BY p.product_id, DATE(t.transaction_date)
    ORDER BY p.product_id, sale_date;
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS get_products_below_reorder_prediction;
DELIMITER //

CREATE PROCEDURE get_products_below_reorder_prediction ()
BEGIN

    SELECT
        p.product_id,
        p.product_name,
        rp.current_stock,
        rp.predicted_reorder_point,
        rp.recommended_order_qty,
        s.supplier_id,
        s.supplier_name

    FROM reorder_predictions rp

    -- get latest prediction per product
    JOIN (
        SELECT product_id, MAX(generated_at) AS latest
        FROM reorder_predictions
        GROUP BY product_id
    ) latest_rp
        ON rp.product_id = latest_rp.product_id
        AND rp.generated_at = latest_rp.latest

    JOIN product p ON rp.product_id = p.product_id
    JOIN supplier s ON p.supplier_id = s.supplier_id

    WHERE rp.current_stock <= rp.predicted_reorder_point

    ORDER BY rp.current_stock ASC;

END //

DELIMITER ;

DROP PROCEDURE IF EXISTS get_reorder_list_by_supplier;
DELIMITER //

CREATE PROCEDURE get_reorder_list_by_supplier ()
BEGIN

    SELECT
        s.supplier_id,
        s.supplier_name,

        p.product_id,
        p.product_name,

        rp.current_stock,
        rp.predicted_reorder_point,
        rp.recommended_order_qty

    FROM reorder_predictions rp

    JOIN (
        SELECT product_id, MAX(generated_at) AS latest
        FROM reorder_predictions
        GROUP BY product_id
    ) latest_rp
        ON rp.product_id = latest_rp.product_id
        AND rp.generated_at = latest_rp.latest

    JOIN product p ON rp.product_id = p.product_id
    JOIN supplier s ON p.supplier_id = s.supplier_id

    WHERE rp.current_stock <= rp.predicted_reorder_point

    ORDER BY s.supplier_name, p.product_name;

END //

DELIMITER ;

--      Create training dataset for Profit Prediction (per-product profit metrics)
DROP PROCEDURE IF EXISTS dataset_profit_prediction; 

DELIMITER //

CREATE PROCEDURE dataset_profit_prediction (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    SELECT 
        p.product_id,
        p.product_name,
        DATE(t.transaction_date) AS sale_date,

        SUM(ti.quantity_sold) AS total_quantity,

        AVG(ti.unit_selling_price - ti.discount_applied) AS avg_price,

        AVG(ti.unit_cost_at_sale) AS avg_cost,

        SUM(
            (ti.unit_selling_price - ti.discount_applied - ti.unit_cost_at_sale)
            * ti.quantity_sold
        ) AS profit

    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    JOIN product p ON ti.product_id = p.product_id

    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'CONFIRMED'

    GROUP BY p.product_id, DATE(t.transaction_date)
    ORDER BY p.product_id, sale_date;
END //

DELIMITER ;

--      Create training dataset for ROI (aggregated financials over time)
DROP PROCEDURE IF EXISTS calculate_roi; 
DELIMITER //

CREATE PROCEDURE calculate_roi (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    DECLARE total_revenue DECIMAL(14,2);
    DECLARE total_cost DECIMAL(14,2);
    DECLARE total_investment DECIMAL(14,2);
    DECLARE operational_costs_total DECIMAL(14,2);
    DECLARE net_profit DECIMAL(14,2);
    DECLARE roi DECIMAL(10,2);

    -- Revenue
    SELECT IFNULL(SUM(ti.total_sale_value), 0)
    INTO total_revenue
    FROM transaction_items ti
    JOIN transaction_log t 
        ON ti.transaction_id = t.transaction_id
    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'CONFIRMED';

    -- COGS
    SELECT IFNULL(SUM(ti.total_cost), 0)
    INTO total_cost
    FROM transaction_items ti
    JOIN transaction_log t 
        ON ti.transaction_id = t.transaction_id
    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'CONFIRMED';

    -- Investments
    SELECT IFNULL(SUM(amount), 0)
    INTO total_investment
    FROM investments
    WHERE investment_date >= p_start_date
    AND investment_date < DATE_ADD(p_end_date, INTERVAL 1 DAY);

    -- Operational Costs
    SELECT IFNULL(SUM(amount), 0)
    INTO operational_costs_total
    FROM operational_costs
    WHERE cost_date BETWEEN p_start_date AND p_end_date;

    -- Net Profit
    SET net_profit = total_revenue - total_cost - operational_costs_total;

    -- ROI
    IF total_investment = 0 THEN
        SET roi = NULL;
    ELSE
        SET roi = (net_profit / total_investment) * 100;
    END IF;

    -- Return result
    SELECT 
        p_start_date AS period_start,
        p_end_date AS period_end,
        total_revenue,
        total_cost,
        total_investment,
        net_profit,
        roi;
    END //
DELIMITER ;

DROP PROCEDURE IF EXISTS dataset_roi_timeseries; 
DELIMITER //
CREATE PROCEDURE dataset_roi_timeseries (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    SELECT
        DATE(t.transaction_date) AS period_date,
        SUM(ti.total_sale_value) AS revenue,
        SUM(ti.total_cost) AS cost,
        IFNULL(oc.total_operational_costs, 0) AS operational_costs,
        IFNULL(inv.total_investments, 0) AS investments,
        (SUM(ti.total_sale_value) - SUM(ti.total_cost)) AS net_profit,
        CASE
            WHEN IFNULL(inv.total_investments, 0) = 0 THEN NULL
            ELSE (
                (SUM(ti.total_sale_value) - SUM(ti.total_cost)) /
                inv.total_investments
            ) * 100
        END AS roi
    FROM transaction_items ti
    JOIN transaction_log t
        ON ti.transaction_id = t.transaction_id
    LEFT JOIN (
        SELECT DATE(cost_date) AS cost_date, SUM(amount) AS total_operational_costs
        FROM operational_costs
        GROUP BY DATE(cost_date)
    ) oc ON oc.cost_date = DATE(t.transaction_date)
    LEFT JOIN (
        SELECT DATE(investment_date) AS investment_date, SUM(amount) AS total_investments
        FROM investments
        GROUP BY DATE(investment_date)
    ) inv ON inv.investment_date = DATE(t.transaction_date)
    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
    AND t.status = 'CONFIRMED'
    GROUP BY DATE(t.transaction_date), oc.total_operational_costs, inv.total_investments
    ORDER BY period_date;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS dataset_cumulative_profit_forecast;
DELIMITER //

CREATE PROCEDURE dataset_cumulative_profit_forecast (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    SELECT
        DATE(forecast_date) AS forecast_date,
        SUM(predicted_profit) AS daily_predicted_profit
    FROM profit_predictions
    WHERE forecast_date BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(forecast_date)
    ORDER BY forecast_date;

END //
DELIMITER ;

--      Create training dataset for CAGR (Yearly revenue)
DROP PROCEDURE IF EXISTS calculate_cagr;
DELIMITER //

CREATE PROCEDURE calculate_cagr (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    DECLARE start_value DECIMAL(14,2);
    DECLARE end_value DECIMAL(14,2);
    DECLARE years DECIMAL(10,4);
    DECLARE cagr DECIMAL(10,4);

    -- Start revenue
    SELECT SUM(ti.total_sale_value)
    INTO start_value
    FROM transaction_items ti
    JOIN transaction_log t 
        ON ti.transaction_id = t.transaction_id
    WHERE DATE(t.transaction_date) = DATE(p_start_date)
        AND t.status = 'CONFIRMED';

    -- End revenue
    SELECT SUM(ti.total_sale_value)
    INTO end_value
    FROM transaction_items ti
    JOIN transaction_log t 
        ON ti.transaction_id = t.transaction_id
    WHERE DATE(t.transaction_date) = DATE(p_end_date)
        AND t.status = 'CONFIRMED';

    -- Years difference
    SET years = TIMESTAMPDIFF(MONTH, p_start_date, p_end_date) / 12;

    IF start_value IS NULL OR start_value = 0 OR years = 0 THEN
        SET cagr = NULL;
    ELSE
        SET cagr = (POWER(end_value / start_value, 1 / years) - 1) * 100;
    END IF;

    SELECT 
        p_start_date AS period_start,
        p_end_date AS period_end,
        start_value,
        end_value,
        years,
        cagr;
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS dataset_cagr_timeseries;
DELIMITER //

CREATE PROCEDURE dataset_cagr_timeseries (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN

    SELECT
        m1.period_month,
        m1.revenue AS current_revenue,
        m2.revenue AS past_revenue,

        CASE 
            WHEN m2.revenue IS NULL OR m2.revenue = 0 THEN NULL
            ELSE ((m1.revenue / m2.revenue) - 1) * 100
        END AS yoy_growth_percent

    FROM (
        -- Monthly revenue (current)
        SELECT
            DATE(DATE_FORMAT(t.transaction_date, '%Y-%m-01')) AS period_month,
            SUM(ti.total_sale_value) AS revenue
        FROM transaction_items ti
        JOIN transaction_log t 
            ON ti.transaction_id = t.transaction_id
        WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
          AND t.status = 'CONFIRMED'
        GROUP BY period_month
    ) m1

    LEFT JOIN (
        -- Monthly revenue (for lag comparison)
        SELECT
            DATE(DATE_FORMAT(t.transaction_date, '%Y-%m-01')) AS period_month,
            SUM(ti.total_sale_value) AS revenue
        FROM transaction_items ti
        JOIN transaction_log t 
            ON ti.transaction_id = t.transaction_id
        WHERE t.status = 'CONFIRMED'
        GROUP BY period_month
    ) m2
    ON m2.period_month = DATE_SUB(m1.period_month, INTERVAL 12 MONTH)

    ORDER BY m1.period_month;

END //

DELIMITER ;

--      KPI Metrics
--  EBIT
DROP PROCEDURE IF EXISTS dataset_ebit;
DELIMITER //

CREATE PROCEDURE dataset_ebit (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    SELECT
        DATE(t.transaction_date) AS period,

        -- Revenue & COGS
        SUM(ti.total_sale_value) AS revenue,
        SUM(ti.total_cost) AS cogs,

        -- Daily Operating Expense (distributed)
        (
            SELECT IFNULL(SUM(amount), 0) / 
                   GREATEST(DATEDIFF(p_end_date, p_start_date), 1)
            FROM operational_costs oc
            WHERE oc.cost_date BETWEEN p_start_date AND p_end_date
        ) AS operating_expenses,

        -- EBIT
        (
            SUM(ti.total_sale_value)
            - SUM(ti.total_cost)
            - (
                SELECT IFNULL(SUM(amount), 0) / 
                       GREATEST(DATEDIFF(p_end_date, p_start_date), 1)
                FROM operational_costs oc
                WHERE oc.cost_date BETWEEN p_start_date AND p_end_date
            )
        ) AS ebit,

        -- EBIT Margin
        CASE 
            WHEN SUM(ti.total_sale_value) = 0 THEN 0
            ELSE (
                (
                    SUM(ti.total_sale_value)
                    - SUM(ti.total_cost)
                    - (
                        SELECT IFNULL(SUM(amount), 0) / 
                               GREATEST(DATEDIFF(p_end_date, p_start_date), 1)
                        FROM operational_costs oc
                        WHERE oc.cost_date BETWEEN p_start_date AND p_end_date
                    )
                ) / SUM(ti.total_sale_value)
            )
        END AS ebit_margin

    FROM transaction_items ti
    JOIN transaction_log t 
        ON ti.transaction_id = t.transaction_id

    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
      AND t.status = 'CONFIRMED'

    GROUP BY DATE(t.transaction_date)
    ORDER BY period;

END //

DELIMITER ;

DROP PROCEDURE IF EXISTS get_current_ebit;
DELIMITER //

CREATE PROCEDURE get_current_ebit (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    SELECT
        IFNULL(SUM(ti.total_sale_value), 0) AS revenue,
        IFNULL(SUM(ti.total_cost), 0) AS cogs,

        (
            SELECT IFNULL(SUM(amount), 0)
            FROM operational_costs oc
            WHERE oc.cost_date BETWEEN p_start_date AND p_end_date
        ) AS operating_expenses,

        (
            IFNULL(SUM(ti.total_sale_value), 0)
            - IFNULL(SUM(ti.total_cost), 0)
            - (
                SELECT IFNULL(SUM(amount), 0)
                FROM operational_costs oc
                WHERE oc.cost_date BETWEEN p_start_date AND p_end_date
            )
        ) AS ebit

    FROM transaction_items ti
    JOIN transaction_log t 
        ON ti.transaction_id = t.transaction_id

    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'CONFIRMED';

END //

DELIMITER ;

DROP PROCEDURE IF EXISTS get_current_ebit_margin;
DELIMITER //

CREATE PROCEDURE get_current_ebit_margin (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    DECLARE v_revenue DECIMAL(14,2);
    DECLARE v_cogs DECIMAL(14,2);
    DECLARE v_opex DECIMAL(14,2);
    DECLARE v_ebit DECIMAL(14,2);

    -- Revenue
    SELECT IFNULL(SUM(ti.total_sale_value), 0)
    INTO v_revenue
    FROM transaction_items ti
    JOIN transaction_log t 
        ON ti.transaction_id = t.transaction_id
    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'CONFIRMED';

    -- COGS
    SELECT IFNULL(SUM(ti.total_cost), 0)
    INTO v_cogs
    FROM transaction_items ti
    JOIN transaction_log t 
        ON ti.transaction_id = t.transaction_id
    WHERE t.transaction_date BETWEEN p_start_date AND p_end_date
        AND t.status = 'CONFIRMED';

    -- Operating Expenses
    SELECT IFNULL(SUM(amount), 0)
    INTO v_opex
    FROM operational_costs
    WHERE cost_date BETWEEN p_start_date AND p_end_date;

    -- EBIT
    SET v_ebit = v_revenue - v_cogs - v_opex;

    -- Result
    SELECT
        p_start_date AS period_start,
        p_end_date AS period_end,
        v_revenue AS revenue,
        v_ebit AS ebit,
        CASE 
            WHEN v_revenue = 0 THEN 0
            ELSE v_ebit / v_revenue
        END AS ebit_margin;

END //

DELIMITER ;

-- Net Profit (Current)
DROP PROCEDURE IF EXISTS calculate_current_net_profit;
DELIMITER //

CREATE PROCEDURE calculate_current_net_profit (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    DECLARE v_revenue DECIMAL(14,2);
    DECLARE v_cogs DECIMAL(14,2);
    DECLARE v_operational DECIMAL(14,2);
    DECLARE v_net_profit DECIMAL(14,2);

    -- Revenue
    SELECT IFNULL(SUM(ti.total_sale_value), 0)
    INTO v_revenue
    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    WHERE t.status = 'CONFIRMED'
      AND t.transaction_date BETWEEN p_start_date AND p_end_date;

    -- COGS
    SELECT IFNULL(SUM(ti.total_cost), 0)
    INTO v_cogs
    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    WHERE t.status = 'CONFIRMED'
      AND t.transaction_date BETWEEN p_start_date AND p_end_date;

    -- Operational Costs
    SELECT IFNULL(SUM(amount), 0)
    INTO v_operational
    FROM operational_costs
    WHERE cost_date BETWEEN p_start_date AND p_end_date;

    SET v_net_profit = v_revenue - v_cogs - v_operational;

    SELECT 
        p_start_date AS period_start,
        p_end_date AS period_end,
        v_revenue AS revenue,
        v_cogs AS cost,
        v_operational AS operational_cost,
        v_net_profit AS net_profit;

END //

DELIMITER ;

-- Net Profit (Predicted)
DROP PROCEDURE IF EXISTS dataset_net_profit_timeseries;
DELIMITER //

CREATE PROCEDURE dataset_net_profit_timeseries (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    SELECT
        DATE(t.transaction_date) AS period,

        SUM(ti.total_sale_value) AS revenue,
        SUM(ti.total_cost) AS cost,

        (
            SELECT IFNULL(SUM(oc.amount), 0)
            FROM operational_costs oc
            WHERE DATE(oc.cost_date) = DATE(t.transaction_date)
        ) AS operational_cost,

        (
            SUM(ti.total_sale_value) - 
            SUM(ti.total_cost)
        ) AS gross_profit,

        (
            SUM(ti.total_sale_value) - 
            SUM(ti.total_cost) -
            (
                SELECT IFNULL(SUM(oc.amount), 0)
                FROM operational_costs oc
                WHERE DATE(oc.cost_date) = DATE(t.transaction_date)
            )
        ) AS net_profit

    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    WHERE t.status = 'CONFIRMED'
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(t.transaction_date)
    ORDER BY period;

END //

DELIMITER ;

-- Save Net Profit Prediction
DROP PROCEDURE IF EXISTS add_net_profit_prediction;
DELIMITER //

CREATE PROCEDURE add_net_profit_prediction (
    IN p_date DATETIME,
    IN p_value DECIMAL(14,2),
    IN p_model VARCHAR(100)
)
BEGIN
    INSERT INTO financial_predictions (
        metric_type,
        predicted_value,
        forecast_date,
        model_name,
        generated_at
    ) VALUES (
        'NET_PROFIT',
        p_value,
        p_date,
        p_model,
        NOW()
    );
END //

DELIMITER ;

-- Net Profit Impact Factors
DROP PROCEDURE IF EXISTS net_profit_by_category;
DELIMITER //

CREATE PROCEDURE net_profit_by_category (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN

    SELECT
        pc.category_id,
        pc.category_name,

        SUM(ti.total_sale_value) AS revenue,
        SUM(ti.total_cost) AS cost,

        (SUM(ti.total_sale_value) - SUM(ti.total_cost)) AS gross_profit,

        (
            SUM(ti.total_sale_value) - 
            SUM(ti.total_cost)
        ) AS net_profit_contribution

    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    JOIN product p ON ti.product_id = p.product_id
    JOIN product_category pc ON p.category_id = pc.category_id

    WHERE t.status = 'CONFIRMED'
      AND t.transaction_date BETWEEN p_start_date AND p_end_date

    GROUP BY pc.category_id
    ORDER BY net_profit_contribution DESC;

END //

DELIMITER ;

-- Gross Profit (Current)
DROP PROCEDURE IF EXISTS calculate_current_gross_profit;
DELIMITER //

CREATE PROCEDURE calculate_current_gross_profit (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    DECLARE v_revenue DECIMAL(14,2);
    DECLARE v_cogs DECIMAL(14,2);
    DECLARE v_gross_profit DECIMAL(14,2);

    -- Revenue
    SELECT IFNULL(SUM(ti.total_sale_value), 0)
    INTO v_revenue
    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    WHERE t.status = 'CONFIRMED'
      AND t.transaction_date BETWEEN p_start_date AND p_end_date;

    -- COGS
    SELECT IFNULL(SUM(ti.total_cost), 0)
    INTO v_cogs
    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    WHERE t.status = 'CONFIRMED'
      AND t.transaction_date BETWEEN p_start_date AND p_end_date;

    SET v_gross_profit = v_revenue - v_cogs;

    SELECT 
        p_start_date AS period_start,
        p_end_date AS period_end,
        v_revenue AS revenue,
        v_cogs AS cost,
        v_gross_profit AS gross_profit;

END //

DELIMITER ;

-- Gross Profit (Predicted)
DROP PROCEDURE IF EXISTS dataset_gross_profit_timeseries;
DELIMITER //

CREATE PROCEDURE dataset_gross_profit_timeseries (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    SELECT
        DATE(t.transaction_date) AS period,

        SUM(ti.total_sale_value) AS revenue,
        SUM(ti.total_cost) AS cost,

        (SUM(ti.total_sale_value) - SUM(ti.total_cost)) AS gross_profit

    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id

    WHERE t.status = 'CONFIRMED'
      AND t.transaction_date BETWEEN p_start_date AND p_end_date

    GROUP BY DATE(t.transaction_date)
    ORDER BY period;

END //

DELIMITER ;

DROP PROCEDURE IF EXISTS add_gross_profit_prediction;
DELIMITER //

CREATE PROCEDURE add_gross_profit_prediction (
    IN p_date DATETIME,
    IN p_value DECIMAL(14,2),
    IN p_model VARCHAR(100)
)
BEGIN
    INSERT INTO financial_predictions (
        metric_type,
        predicted_value,
        period_start,
        period_end,
        model_name,
        generated_at
    ) VALUES (
        'GROSS_PROFIT',
        p_value,
        p_date,
        p_date,
        p_model,
        NOW()
    );
END //

DELIMITER ;

-- Gross Profit Contributors
DROP PROCEDURE IF EXISTS gross_profit_by_category;
DELIMITER //

CREATE PROCEDURE gross_profit_by_category (
    IN p_start_date DATETIME,
    IN p_end_date DATETIME
)
BEGIN
    SELECT
        pc.category_id,
        pc.category_name,

        SUM(ti.total_sale_value) AS revenue,
        SUM(ti.total_cost) AS cost,

        (SUM(ti.total_sale_value) - SUM(ti.total_cost)) AS gross_profit

    FROM transaction_items ti
    JOIN transaction_log t ON ti.transaction_id = t.transaction_id
    JOIN product p ON ti.product_id = p.product_id
    JOIN product_category pc ON p.category_id = pc.category_id

    WHERE t.status = 'CONFIRMED'
      AND t.transaction_date BETWEEN p_start_date AND p_end_date

    GROUP BY pc.category_id
    ORDER BY gross_profit DESC;

END //

DELIMITER ;

-- ----------------------------------------------------------------------------------
--      Add generated prediction results into respective table
-- ---------------------------------------------------------------------------------
-- Demand Forecasting
DROP PROCEDURE IF EXISTS add_demand_forecast; 
DELIMITER //

CREATE PROCEDURE add_demand_forecast (
    IN df_product_id INT,
    IN df_forecast_date DATE,
    IN df_predicted_demand DECIMAL(12,2),
    IN df_model_name VARCHAR(100)
)
BEGIN
    INSERT INTO demand_forecasts (
        product_id,
        forecast_date,
        predicted_demand,
        model_name,
        generated_at
    )
    VALUES (
        df_product_id,
        df_forecast_date,
        df_predicted_demand,
        df_model_name,
        NOW()
    ) -- removed semicolon
    ON DUPLICATE KEY UPDATE
        predicted_demand = VALUES(predicted_demand),
        generated_at = NOW();
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS get_demand_forecasts; 
DELIMITER //

CREATE PROCEDURE get_demand_forecasts ()
BEGIN
    SELECT *
    FROM demand_forecasts df
    WHERE generated_at = (
        SELECT MAX(generated_at)
        FROM demand_forecasts
    );
END //

DELIMITER ;

    -- Reorder Predictions
DROP PROCEDURE IF EXISTS dataset_lead_time;
DELIMITER //
CREATE PROCEDURE dataset_lead_time ()
BEGIN
    SELECT
        po.po_id,
        poi.product_id,
        po.supplier_id,

        po.order_date,

        -- arrival date (from inventory log)
        MIN(il.log_date) AS received_date,

        DATEDIFF(MIN(il.log_date), po.order_date) AS lead_time_days,

        poi.quantity,
        poi.unit_cost

    FROM purchase_orders po
    JOIN purchase_order_items poi 
        ON po.po_id = poi.po_id

    JOIN inventory_log il 
        ON il.reference_id = po.po_id
        AND il.product_id = poi.product_id
        AND il.change_type = 'IN'

    GROUP BY po.po_id, poi.product_id

    HAVING lead_time_days IS NOT NULL
    ORDER BY po.order_date;

END //

DELIMITER ;

DROP PROCEDURE IF EXISTS add_reorder_prediction;
DELIMITER //

CREATE PROCEDURE add_reorder_prediction (
    IN rp_product_id INT,
    IN rp_predicted_reorder_point DECIMAL(12,2),
    IN rp_recommended_order_qty DECIMAL(12,2),
    IN rp_current_stock DECIMAL(12,2),
    IN rp_model_name VARCHAR(100)
)
BEGIN
    INSERT INTO reorder_predictions (
        product_id,
        current_stock,
        predicted_reorder_point,
        recommended_order_qty,
        model_name,
        generated_at
    )
    VALUES (
        rp_product_id,
        rp_current_stock,
        rp_predicted_reorder_point,
        rp_recommended_order_qty,
        rp_current_stock,
        NOW()
    );
END //

DELIMITER ;

    -- Profit Optimization
DROP PROCEDURE IF EXISTS add_profit_prediction;
DELIMITER //

CREATE PROCEDURE add_profit_prediction (
    IN pp_product_id INT,
    IN pp_predicted_profit DECIMAL(14,2),
    IN pp_start DATETIME,
    IN pp_end DATETIME,
    IN pp_model VARCHAR(100)
)
BEGIN
    INSERT INTO profit_predictions (
        product_id,
        predicted_profit,
        period_start,
        period_end,
        model_name,
        generated_at
    )
    VALUES (
        pp_product_id,
        pp_predicted_profit,
        pp_start,
        pp_end,
        pp_model,
        NOW()
    );
END //

DELIMITER ;

    -- ROI and CAGR
DROP PROCEDURE IF EXISTS add_financial_prediction;
DELIMITER //

CREATE PROCEDURE add_financial_prediction (
    IN fp_metric_type ENUM('ROI','CAGR'),
    IN fp_predicted_value DECIMAL(12,4),
    IN fp_forecast_date DATE,
    IN fp_model_name VARCHAR(100)
)
BEGIN
    INSERT INTO financial_predictions (
        metric_type,
        predicted_value,
        forecast_date,
        model_name,
        generated_at
    )
    VALUES (
        fp_metric_type,
        fp_predicted_value,
        fp_forecast_date,
        fp_model_name,
        NOW()
    ) -- removed semicolon
    ON DUPLICATE KEY UPDATE
        predicted_value = VALUES(predicted_value),
        generated_at = NOW();
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS add_break_even_prediction;
DELIMITER //

CREATE PROCEDURE add_break_even_prediction (
    IN p_investment_id BIGINT,
    IN p_date DATETIME,
    IN p_amount DECIMAL(14,2),
    IN p_model VARCHAR(100)
)
BEGIN
    INSERT INTO roi_break_even_predictions (
        investment_id,
        predicted_break_even_date,
        investment_amount,
        model_name,
        generated_at
    )
    VALUES (
        p_investment_id,
        p_date,
        p_amount,
        p_model,
        NOW()
    );
END //

DELIMITER ;

    -- EBIT
DROP PROCEDURE IF EXISTS add_ebit_prediction;
DELIMITER //

CREATE PROCEDURE add_ebit_prediction (
    IN p_date DATETIME,
    IN p_value DECIMAL(14,2),
    IN p_model VARCHAR(100)
)
BEGIN
    INSERT INTO ebit_predictions (
        forecast_date,
        predicted_ebit,
        model_name,
        generated_at
    )
    VALUES (
        p_date,
        p_value,
        p_model,
        NOW()
    );
END //

DELIMITER ;


--      Add adjustment row in inventory_log (Should only be adjustment)
DROP PROCEDURE IF EXISTS add_inventory_log_entry; 

DELIMITER //

CREATE PROCEDURE add_inventory_log_entry (
    IN il_product_id INT,
    IN il_quantity SMALLINT,
    IN il_unit_cost DECIMAL(8, 2),
    IN reference_id BIGINT,
    IN il_reference_type ENUM('TRANSACTION', 'PURCHASE')
)
BEGIN
    DECLARE temp_product_id INT;

    -- Check if product exists
    SELECT product_id INTO temp_product_id
    FROM product_category
    WHERE product_id = il_product_id
    LIMIT 1;

    IF temp_product_id IS NULL THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid product_id';
    END IF;

    -- Proceed to insert
    INSERT INTO inventory_log (
        product_id,
        change_type,
        quantity,
        unit_cost,
        log_date,
        reference_id,
        reference_type
    )
    VALUES (
        il_product_id,
        'ADJUSTMENT',
        il_quantity,
        il_unit_cost,
        reference_id,
        il_reference_type
    );
END //

DELIMITER ;

--      Add row in operational_costs
DROP PROCEDURE IF EXISTS add_operational_cost_entry; 

DELIMITER //

CREATE PROCEDURE add_operational_cost_entry (
    IN oc_cost_type ENUM('RENT', 'UTILITIES', 'WAGES', 'MAINTENANCE', 'OTHER'),
    IN oc_amount DECIMAL(12, 2),
    IN oc_cost_date DATETIME,
    IN oc_notes VARCHAR(255)
)
BEGIN
    INSERT INTO operational_costs (
        cost_type,
        amount,
        cost_date,
        notes
    )
    VALUES (
        oc_cost_type,
        oc_amount,
        NOW(),
        oc_notes
    );
END //

DELIMITER ;

--      Edit row in operational_costs
DROP PROCEDURE IF EXISTS edit_operational_cost;
DELIMITER //

CREATE PROCEDURE edit_operational_cost (
    IN oc_cost_id BIGINT,
    IN oc_cost_type ENUM('RENT', 'UTILITIES', 'WAGES', 'MAINTENANCE', 'OTHER'),
    IN oc_amount DECIMAL(12, 2),
    IN oc_cost_date DATETIME,
    IN oc_notes VARCHAR(255)
)
BEGIN
    -- Check if entry exists
    IF NOT EXISTS (
        SELECT 1
        FROM operational_costs
        WHERE cost_id = oc_cost_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Operational cost entry not found';
    END IF;

    UPDATE operational_costs
    SET
        cost_type = COALESCE(oc_cost_type, cost_type),
        amount = COALESCE(oc_amount, amount),
        cost_date = COALESCE(oc_cost_date, cost_date),
        notes = COALESCE(oc_notes, notes)
    WHERE cost_id = oc_cost_id;

END //

DELIMITER ;

--      Remove row in operational_costs
DROP PROCEDURE IF EXISTS remove_operational_cost; 

DELIMITER //

CREATE PROCEDURE remove_operational_cost (
    IN oc_cost_id BIGINT
)
BEGIN
    -- Check if entry exists
    IF NOT EXISTS (
        SELECT 1
        FROM operational_costs 
        WHERE cost_id = oc_cost_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Operational cost entry not found';
    END IF;

    DELETE FROM operational_costs 
    WHERE cost_id = oc_cost_id;
END //

DELIMITER ;


--      Add row in investments
DROP PROCEDURE IF EXISTS add_investments_entry; 

DELIMITER //

CREATE PROCEDURE add_investments_entry (
    IN in_amount DECIMAL(12, 2),
    IN in_investment_date DATETIME,
    IN in_description VARCHAR(255)
)
BEGIN
    INSERT INTO investments (
        amount,
        investment_date,
        description
    )
    VALUES (
        in_amount,
        in_investment_date,
        in_description
    );
END //

DELIMITER ;

--      Edit row in investments
DROP PROCEDURE IF EXISTS edit_operational_cost;
DELIMITER //

CREATE PROCEDURE edit_operational_cost (
    IN in_investment_id BIGINT,
    IN in_amount DECIMAL(12, 2),
    IN in_investment_date DATETIME,
    IN description VARCHAR(255)
)
BEGIN
    -- Check if entry exists
    IF NOT EXISTS (
        SELECT 1
        FROM investments
        WHERE investment_id = in_investment_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Investment entry not found';
    END IF;

    UPDATE investments
    SET
        amount = COALESCE(in_amount, amount),
        investment_date = COALESCE(in_investment_date, investment_date),
        description = COALESCE(in_investment_date, description)
    WHERE cost_id = oc_cost_id;

END //

DELIMITER ;

--      Remove row in investments
DROP PROCEDURE IF EXISTS remove_investment; 
DELIMITER //

CREATE PROCEDURE remove_investment (
    IN in_investment_id BIGINT
)
BEGIN
    -- Check if entry exists
    IF NOT EXISTS (
        SELECT 1
        FROM investments 
        WHERE investment_id = investment_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Investment entry not found';
    END IF;

    DELETE FROM investments 
    WHERE investment_id = investment_id;
END //

DELIMITER ;

--      Add row in purchase_orders
DROP PROCEDURE IF EXISTS add_purchase_order_entry; 

DELIMITER //

CREATE PROCEDURE add_purchase_order_entry (
    IN po_supplier_name VARCHAR(255),
    IN po_order_date DATETIME,
    IN po_total_cost DECIMAL(12, 2)
)
BEGIN
    -- Check if supplier id is valid
    DECLARE po_supplier_id SMALLINT;

    SELECT supplier_id INTO po_supplier_id
    FROM supplier
    WHERE LOWER(supplier_name) = LOWER(po_supplier_name)
    LIMIT 1;

    IF po_supplier_id IS NULL THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid po_supplier_id';
    END IF;

    INSERT INTO operational_costs (
        supplier_id,
        order_date,
        total_cost
    )
    VALUES (
        po_supplier_id,
        po_order_date,
        po_total_cost
    );

    
END //

DELIMITER ;

--      Edit row in purchase_orders
DROP PROCEDURE IF EXISTS edit_purchase_order;
DELIMITER //

CREATE PROCEDURE edit_purchase_order (
    IN po_po_id BIGINT,
    IN po_supplier_name VARCHAR(255),
    IN po_order_date DATETIME,
    IN po_total_cost DECIMAL(12, 2)
)
BEGIN
    -- Check if supplier id is valid
    DECLARE po_supplier_id SMALLINT;
    
    IF NOT EXISTS (
        SELECT 1 FROM purchase_orders WHERE po_id = po_po_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'PO entry not found';
    END IF;

    SELECT supplier_id INTO po_supplier_id
    FROM supplier
    WHERE LOWER(supplier_name) = LOWER(po_supplier_name)
    LIMIT 1;

    IF po_supplier_id IS NULL THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid po_supplier_id';
    END IF;

    UPDATE purchase_orders
    SET
        supplier_id = COALESCE(po_supplier_id, supplier_id),
        order_date = COALESCE(po_order_date, order_date),
        total_cost = COALESCE(po_total_cost, total_cost)
    WHERE po_id = po_po_id;

END //

DELIMITER ;

--      Remove row in purchase_orders & purchase_order_items
DROP PROCEDURE IF EXISTS remove_purchase_order; 
DELIMITER //

CREATE PROCEDURE remove_purchase_order (
    IN po_po_id BIGINT
)
BEGIN
    -- Check if entry exists
    IF NOT EXISTS (
        SELECT 1
        FROM purchase_orders 
        WHERE po_id = po_po_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Purchase order not found';
    END IF;

    DELETE FROM purchase_order_items 
    WHERE po_id = po_po_id;

    DELETE FROM purchase_orders 
    WHERE po_id = po_po_id;
END //

DELIMITER ;


--      Add or edit row in purchase_order_items
DROP PROCEDURE IF EXISTS upsert_purchase_order_item;
DELIMITER //

CREATE PROCEDURE upsert_purchase_order_item (
    IN p_po_id BIGINT,
    IN p_product_id INT,
    IN p_quantity SMALLINT,
    IN p_unit_cost DECIMAL(12,2),
    IN p_mode ENUM('ADD','SET') -- ADD = increment, SET = overwrite
)
BEGIN
    DECLARE existing_qty SMALLINT DEFAULT 0;
    DECLARE row_exists INT DEFAULT 0;

    -- Validate PO exists
    IF NOT EXISTS (
        SELECT 1 FROM purchase_orders WHERE po_id = p_po_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid purchase order ID';
    END IF;

    -- Validate product exists
    IF NOT EXISTS (
        SELECT 1 FROM product WHERE product_id = p_product_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid product ID';
    END IF;

    -- Check if item already exists
    SELECT COUNT(*), IFNULL(MAX(quantity),0)
    INTO row_exists, existing_qty
    FROM purchase_order_items
    WHERE po_id = p_po_id
      AND product_id = p_product_id;

    IF row_exists = 0 THEN

        -- INSERT new item
        INSERT INTO purchase_order_items (
            po_id,
            product_id,
            quantity,
            unit_cost
        ) VALUES (
            p_po_id,
            p_product_id,
            p_quantity,
            p_unit_cost
        );

    ELSE

        -- UPDATE existing item
        UPDATE purchase_order_items
        SET
            quantity = CASE 
                WHEN p_mode = 'ADD' THEN existing_qty + p_quantity
                ELSE p_quantity
            END,
            unit_cost = COALESCE(p_unit_cost, unit_cost)
        WHERE po_id = p_po_id
          AND product_id = p_product_id;

    END IF;

    -- Auto-remove if quantity becomes 0
    DELETE FROM purchase_order_items
    WHERE po_id = p_po_id
    AND product_id = p_product_id
    AND quantity <= 0;

    -- Recalculate total_cost
    UPDATE purchase_orders po
    SET total_cost = (
        SELECT SUM(quantity * unit_cost)
        FROM purchase_order_items
        WHERE po_id = p_po_id
    )
    WHERE po_id = p_po_id;

END //

DELIMITER ;

--      Add, edit, remove row in product_batches
--          * Ensure to update inventory_log accordingly
--          * Barcode should be generated using python/java script
DROP PROCEDURE IF EXISTS add_product_batches_entry; 

DELIMITER //

CREATE PROCEDURE add_product_batches_entry (
    IN pb_product_name VARCHAR(255),
    IN pb_supplier_name VARCHAR(255),
    IN pb_quantity_received SMALLINT,
    IN pb_unit_cost DECIMAL(12, 2),
    IN pb_date_received DATETIME,
    IN pb_barcode VARCHAR(100)
)
BEGIN
    DECLARE pb_product_id INT;
    DECLARE pb_supplier_id SMALLINT;
    DECLARE pb_batch_id BIGINT;

    -- Validate product & supplier
    SELECT product_id INTO pb_product_id
    FROM product
    WHERE LOWER(product_name) = LOWER(pb_product_name)
    LIMIT 1;

    SELECT supplier_id INTO pb_supplier_id
    FROM supplier
    WHERE LOWER(supplier_name) = LOWER(pb_supplier_name)
    LIMIT 1;

    -- Check if product and supplier exists
    IF pb_product_id IS NULL THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid pb_product_id';
    END IF;

    IF pb_supplier_id IS NULL THEN 
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid pb_supplier_id';
    END IF;

    INSERT INTO product_batches (
        product_id,
        supplier_id,
        quantity_received,
        unit_cost,
        date_received,
        barcode
    )
    VALUES (
        pb_product_id,
        pb_supplier_id,
        pb_quantity_received,
        pb_unit_cost,
        pb_date_received,
        pb_barcode  
    );

    -- Update Inventory Log
    SET pb_batch_id = LAST_INSERT_ID();

    INSERT INTO inventory_log (
        product_id,
        change_type,
        quantity,
        unit_cost,
        log_date,
        reference_id,
        reference_type
    )
    VALUES (
        pb_product_id,
        'IN',
        pb_quantity_received,
        pb_unit_cost,
        pb_date_received,
        pb_batch_id,
        'BATCH'
    );

    -- Update product stock level
    -- UPDATE product
    -- SET current_stock_level = current_stock_level + pb_quantity_received,
    --     last_update = NOW()
    -- WHERE product_id = pb_product_id;
    
END //

DELIMITER ;

DROP PROCEDURE IF EXISTS edit_product_batches_entry; 
DELIMITER //

CREATE PROCEDURE edit_product_batches_entry (
    IN pb_batch_id BIGINT,
    IN pb_new_quantity SMALLINT,
    IN pb_new_unit_cost DECIMAL(12, 2),
    IN pb_new_date_received DATETIME,
    IN pb_new_barcode VARCHAR(100)
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_old_quantity SMALLINT;
    DECLARE v_old_unit_cost DECIMAL(12,2);

    -- Check if entry exists and is valid
    SELECT 
        product_id,
        quantity_received,
        unit_cost
    INTO 
        v_product_id,
        v_old_quantity,
        v_old_unit_cost
    FROM product_batches
    WHERE batch_id = pb_batch_id;

    IF v_product_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Batch not found';
    END IF;

    -- Remove old data
    -- UPDATE product
    -- SET current_stock_level = current_stock_level - v_old_quantity,
    --     last_update = NOW()
    -- WHERE product_id = v_product_id;

    -- Update tables
    UPDATE product_batches
    SET 
        quantity_received = pb_new_quantity,
        unit_cost = pb_new_unit_cost,
        date_received = pb_new_date_received,
        barcode = pb_new_barcode
    WHERE batch_id = pb_batch_id;

    -- UPDATE product
    -- SET current_stock_level = current_stock_level + pb_new_quantity,
    --     last_update = NOW()
    -- WHERE product_id = v_product_id;

    INSERT INTO inventory_log (
        product_id,
        change_type,
        quantity,
        unit_cost,
        log_date,
        reference_id,
        reference_type
    )
    VALUES (
        v_product_id,
        'ADJUSTMENT',
        pb_new_quantity - v_old_quantity,
        pb_new_unit_cost,
        NOW(),
        pb_batch_id,
        'BATCH'
    );

END //

DELIMITER ;

DROP PROCEDURE IF EXISTS remove_product_batch_entry;
DELIMITER //

CREATE PROCEDURE remove_product_batch_entry(
    IN pb_batch_id BIGINT
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_quantity SMALLINT;
    DECLARE v_remaining_stock SMALLINT;

    -- Fetch and validate entry
    SELECT 
        product_id,
        quantity_received
    INTO 
        v_product_id,
        v_quantity
    FROM product_batches
    WHERE batch_id = pb_batch_id;

    IF v_product_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Batch not found';
    END IF;

    -- Cancel if used in POS
    IF EXISTS (
        SELECT 1
        FROM transaction_items
        WHERE batch_id = pb_batch_id
        LIMIT 1
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete batch: already used in sales';
    END IF;

    -- Prevent negative stock
    -- SELECT current_stock_level INTO v_remaining_stock
    -- FROM product
    -- WHERE product_id = v_product_id;

    IF v_remaining_stock < v_quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock inconsistency detected';
    END IF;

    -- Remove entry across tables
    -- UPDATE product
    -- SET current_stock_level = current_stock_level - v_quantity,
    --     last_update = NOW()
    -- WHERE product_id = v_product_id;

    DELETE FROM inventory_log
    WHERE reference_id = pb_batch_id
      AND reference_type = 'BATCH';

    DELETE FROM product_batches
    WHERE batch_id = pb_batch_id;

END //

DELIMITER ;

-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
-- Miscellaneous Procedures for extraneous features that can be used in any module
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
-- Search for products
DROP PROCEDURE IF EXISTS search_products; 

DELIMITER //

CREATE PROCEDURE search_products (
    IN p_search VARCHAR(255),
    IN p_category_id SMALLINT,
    IN p_manufacturer VARCHAR(255),
    IN p_year INT,
    IN p_sort VARCHAR(50)   -- 'name', 'price', 'stock', 'newest', 'most_purchased'
)
BEGIN
    SELECT 
        p.product_name,
        pi.image_path,
        p.product_id,
        pc.category_name,
        s.supplier_name,
        p.storage_location,
        -- p.current_stock_level,
        p.retail_price

    FROM product p
    LEFT JOIN product_category pc 
        ON p.category_id = pc.category_id
    LEFT JOIN supplier s 
        ON p.supplier_id = s.supplier_id
    LEFT JOIN compatibility c 
        ON p.product_id = c.product_id
    LEFT JOIN vehicles v 
        ON c.vehicle_id = v.vehicle_id
    LEFT JOIN manufacturers m
        ON v.manufacturer_id = m.manufacturer_id
    LEFT JOIN product_images pi 
        ON p.product_id = pi.product_id
    LEFT JOIN (
        SELECT 
            product_id,
            SUM(quantity_sold) AS total_sold
        FROM transaction_items
        GROUP BY product_id
    ) ts ON p.product_id = ts.product_id

    WHERE
        -- Search name or description
        (
            p_search IS NULL OR
            p.product_name LIKE CONCAT('%', p_search, '%') OR
            p.product_description LIKE CONCAT('%', p_search, '%')
        )

        -- Category filter
        AND (
            p_category_id IS NULL OR
            p.category_id = p_category_id
        )

        -- Manufacturer filter
        AND (
            p_manufacturer IS NULL OR
            LOWER(m.manufacturer_name) LIKE CONCAT('%', LOWER(p_manufacturer), '%')
        )

        -- Year range filter
        AND (
            p_year IS NULL OR
            c.product_id IS NULL OR
            (p_year BETWEEN c.bottom_year AND c.top_year)
        )

    GROUP BY p.product_id, pi.image_path, pc.category_name, s.supplier_name

    ORDER BY 
        CASE WHEN p_sort = 'name' THEN p.product_name END ASC,
        CASE WHEN p_sort = 'price' THEN p.unit_cost END ASC,
        -- CASE WHEN p_sort = 'stock' THEN p.current_stock_level END ASC,
        CASE WHEN p_sort = 'newest' THEN p.date_added END DESC,
        CASE WHEN p_sort = 'most_purchased' THEN ts.total_sold END DESC;
END //

DELIMITER ;

--      Fetch expanded product information based on selection
DROP PROCEDURE IF EXISTS get_product_details;
DELIMITER //

CREATE PROCEDURE get_product_details (
    IN p_product_id INT
)
BEGIN

    SELECT 
        p.product_id,
        p.part_number,
        p.product_name,
        p.product_description,
        pc.category_name,
        s.supplier_name,
        p.storage_location,
        p.unit_cost,
        p.retail_price,
        -- p.current_stock_level,
        m.manufacturer_name,
        v.model_name,
        c.bottom_year,
        c.top_year

    FROM product p
    LEFT JOIN product_category pc 
        ON p.category_id = pc.category_id
    LEFT JOIN supplier s 
        ON p.supplier_id = s.supplier_id
    LEFT JOIN compatibility c 
        ON p.product_id = c.product_id
    LEFT JOIN vehicles v 
        ON c.vehicle_id = v.vehicle_id
    LEFT JOIN manufacturers m
        ON v.manufacturer_id = m.manufacturer_id

    WHERE p.product_id = p_product_id;

END //

DELIMITER ;


-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------
--                  Triggers to maintain db-wide consistency
-- ----------------------------------------------------------------------------------
-- ----------------------------------------------------------------------------------

-- Maintain product stock level on changes to product_batches
-- DROP TRIGGER IF EXISTS trg_update_product_stock_after_batch_update;
-- DELIMITER //

-- CREATE TRIGGER trg_update_product_stock_after_batch_update
-- AFTER UPDATE ON product_batches
-- FOR EACH ROW
-- BEGIN
--     DECLARE v_total_stock INT;

--     -- Recalculate total stock from all batches
--     SELECT IFNULL(SUM(quantity_remaining), 0)
--     INTO v_total_stock
--     FROM product_batches
--     WHERE product_id = NEW.product_id;

--     -- Update product table
--     UPDATE product
--     SET current_stock_level = v_total_stock,
--         last_update = NOW()
--     WHERE product_id = NEW.product_id;

-- END //

-- DELIMITER ;

-- DROP TRIGGER IF EXISTS trg_update_product_stock_after_batch_insert;
-- DELIMITER //

-- CREATE TRIGGER trg_update_product_stock_after_batch_insert
-- AFTER INSERT ON product_batches
-- FOR EACH ROW
-- BEGIN
--     DECLARE v_total_stock INT;

--     SELECT IFNULL(SUM(quantity_remaining), 0)
--     INTO v_total_stock
--     FROM product_batches
--     WHERE product_id = NEW.product_id;

--     UPDATE product
--     SET current_stock_level = v_total_stock,
--         last_update = NOW()
--     WHERE product_id = NEW.product_id;

-- END //

-- DELIMITER ;

-- DROP TRIGGER IF EXISTS trg_update_product_stock_after_batch_delete;
-- DELIMITER //

-- CREATE TRIGGER trg_update_product_stock_after_batch_delete
-- AFTER DELETE ON product_batches
-- FOR EACH ROW
-- BEGIN
--     DECLARE v_total_stock INT;

--     SELECT IFNULL(SUM(quantity_remaining), 0)
--     INTO v_total_stock
--     FROM product_batches
--     WHERE product_id = OLD.product_id;

--     UPDATE product
--     SET current_stock_level = v_total_stock,
--         last_update = NOW()
--     WHERE product_id = OLD.product_id;

-- END //

-- DELIMITER ;

DROP TRIGGER IF EXISTS trg_prevent_negative_stock;
DELIMITER //

CREATE TRIGGER trg_prevent_negative_stock
BEFORE UPDATE ON product_batches
FOR EACH ROW
BEGIN
    IF NEW.quantity_remaining < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock cannot go negative';
    END IF;
END //

DELIMITER ;

DROP TRIGGER IF EXISTS trg_auto_inventory_log;
DELIMITER //

CREATE TRIGGER trg_auto_inventory_log
AFTER UPDATE ON product_batches
FOR EACH ROW
BEGIN
    DECLARE v_change INT;

    SET v_change = NEW.quantity_remaining - OLD.quantity_remaining;

    IF v_change != 0 THEN
        INSERT INTO inventory_log (
            product_id,
            change_type,
            quantity,
            unit_cost,
            log_date,
            reference_id,
            reference_type
        ) VALUES (
            NEW.product_id,
            IF(v_change > 0, 'IN', 'OUT'),
            ABS(v_change),
            NEW.unit_cost,
            NOW(),
            NEW.batch_id,
            'ADJUSTMENT'
        );
    END IF;

END //

DELIMITER ;

-- Trigger to update total_cost in purchase_orders after change in purchase_order_items

DROP TRIGGER IF EXISTS trg_purchase_order_items_after_mod;
DROP TRIGGER IF EXISTS trg_purchase_order_items_after_update;
DROP TRIGGER IF EXISTS trg_purchase_order_items_after_delete;
DELIMITER //

CREATE TRIGGER trg_purchase_order_items_after_mod
AFTER INSERT ON purchase_order_items
FOR EACH ROW
BEGIN
    UPDATE purchase_orders AS po
    SET po.total_cost = (
        SELECT COALESCE(SUM(quantity * unit_cost), 0)
        FROM purchase_order_items
        WHERE po_id = NEW.po_id
    )
    WHERE po.po_id = NEW.po_id;
END //

CREATE TRIGGER trg_purchase_order_items_after_update
AFTER UPDATE ON purchase_order_items
FOR EACH ROW
BEGIN
    UPDATE purchase_orders AS po
    SET po.total_cost = (
        SELECT COALESCE(SUM(quantity * unit_cost), 0)
        FROM purchase_order_items
        WHERE po_id = NEW.po_id
    )
    WHERE po.po_id = NEW.po_id;
END //

CREATE TRIGGER trg_purchase_order_items_after_delete
AFTER DELETE ON purchase_order_items
FOR EACH ROW
BEGIN
    UPDATE purchase_orders AS po
    SET po.total_cost = (
        SELECT COALESCE(SUM(quantity * unit_cost), 0)
        FROM purchase_order_items
        WHERE po_id = OLD.po_id
    )
    WHERE po.po_id = OLD.po_id;
END //

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
