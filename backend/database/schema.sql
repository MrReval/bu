-- ─────────────────────────────────────────────────────────────────────────
-- پلتفرم چند‌سالنی (Multi-tenant) — MySQL 8
-- ─────────────────────────────────────────────────────────────────────────

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ── جدول‌های پلتفرم (سوپرادمین) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    domain VARCHAR(191) NOT NULL UNIQUE,
    slug VARCHAR(191) NOT NULL DEFAULT 'salon',
    business_type VARCHAR(32) NOT NULL DEFAULT 'beauty_salon',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    package_id INT NULL,
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sites_business_type (business_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'super_admin',
    is_active TINYINT NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_platform_admins_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    token VARCHAR(191) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES platform_admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(191) NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    price_monthly BIGINT NOT NULL DEFAULT 0,
    price_yearly BIGINT NOT NULL DEFAULT 0,
    is_active TINYINT NOT NULL DEFAULT 1,
    business_type VARCHAR(32) NOT NULL DEFAULT 'beauty_salon',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_packages_business_type (business_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS package_features (
    package_id INT NOT NULL,
    feature_id INT NOT NULL,
    PRIMARY KEY (package_id, feature_id),
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    package_id INT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'monthly',
    amount BIGINT NOT NULL DEFAULT 0,
    starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    note VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- تنظیمات پیامک سطح پلتفرم (سوپرادمین)
CREATE TABLE IF NOT EXISTS platform_sms_settings (
    id INT PRIMARY KEY,
    provider VARCHAR(30) NOT NULL DEFAULT 'melipayamak',
    is_enabled TINYINT NOT NULL DEFAULT 0,
    credentials_json TEXT NOT NULL DEFAULT ('{}'),
    patterns_json TEXT NOT NULL DEFAULT ('{}'),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── جدول‌های سالن (اسکوپ‌شده با site_id) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    email VARCHAR(191),
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    name VARCHAR(191) NOT NULL,
    is_verified TINYINT NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_site_phone (site_id, phone),
    UNIQUE KEY uq_users_site_email (site_id, email),
    KEY idx_users_site (site_id),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    user_id INT NOT NULL,
    token VARCHAR(191) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_tokens_site (site_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salon_settings (
    site_id INT NOT NULL PRIMARY KEY,
    name VARCHAR(191) NOT NULL DEFAULT 'مجموعه',
    slug VARCHAR(191) NOT NULL DEFAULT 'site',
    phone VARCHAR(30) DEFAULT '',
    address VARCHAR(255) DEFAULT '',
    timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Tehran',
    logo_path VARCHAR(255),
    favicon_path VARCHAR(255),
    primary_color VARCHAR(20) NOT NULL DEFAULT '#be185d',
    secondary_color VARCHAR(20) NOT NULL DEFAULT '#831843',
    accent_color VARCHAR(20) NOT NULL DEFAULT '#f472b6',
    font_family VARCHAR(60) NOT NULL DEFAULT 'Vazirmatn',
    hero_title VARCHAR(255) NOT NULL DEFAULT '',
    hero_subtitle VARCHAR(255) NOT NULL DEFAULT '',
    hero_image VARCHAR(255),
    about_html TEXT,
    social_links_json TEXT NOT NULL DEFAULT ('{}'),
    business_hours_json TEXT NOT NULL DEFAULT ('{}'),
    booking_rules_json TEXT NOT NULL DEFAULT ('{"min_notice_hours":2,"allow_staff_selection":true,"auto_confirm":true}'),
    is_booking_enabled TINYINT NOT NULL DEFAULT 1,
    deposit_enabled TINYINT NOT NULL DEFAULT 0,
    default_deposit_percent INT NOT NULL DEFAULT 0,
    bale_token VARCHAR(255) NOT NULL DEFAULT '',
    bale_chat_id VARCHAR(100) NOT NULL DEFAULT '',
    bale_daily_enabled TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS landing_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible TINYINT NOT NULL DEFAULT 1,
    config_json TEXT NOT NULL DEFAULT ('{}'),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_sections_site (site_id),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    name VARCHAR(191) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT NOT NULL DEFAULT 1,
    KEY idx_categories_site (site_id),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    category_id INT,
    name VARCHAR(191) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 30,
    price DOUBLE NOT NULL DEFAULT 0,
    price_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
    deposit_percent INT NOT NULL DEFAULT 0,
    is_active TINYINT NOT NULL DEFAULT 1,
    image_path VARCHAR(255),
    KEY idx_services_site (site_id),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    user_id INT UNIQUE,
    display_name VARCHAR(191) NOT NULL,
    bio TEXT,
    avatar_path VARCHAR(255),
    specialties_json TEXT NOT NULL DEFAULT ('[]'),
    color_hex VARCHAR(20) NOT NULL DEFAULT '#be185d',
    is_accepting_bookings TINYINT NOT NULL DEFAULT 1,
    satisfaction_percent INT NOT NULL DEFAULT 98,
    KEY idx_staff_site (site_id),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    caption VARCHAR(255) DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_gallery_site (site_id),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_portfolio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    staff_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    caption VARCHAR(255) DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_portfolio_site (site_id),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_staff (
    service_id INT NOT NULL,
    staff_id INT NOT NULL,
    PRIMARY KEY (service_id, staff_id),
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_working_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT,
    day_of_week INT NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    breaks_json TEXT NOT NULL DEFAULT ('[]'),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff_time_off (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    reason VARCHAR(255) DEFAULT '',
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
    user_id INT PRIMARY KEY,
    notes TEXT,
    birth_date VARCHAR(20),
    national_id VARCHAR(20) NULL,
    marketing_opt_in TINYINT NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    customer_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    total_price DOUBLE NOT NULL DEFAULT 0,
    deposit_amount DOUBLE NOT NULL DEFAULT 0,
    deposit_status VARCHAR(20) NOT NULL DEFAULT 'none',
    notes_customer TEXT,
    notes_internal TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'web',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_appointments_site (site_id),
    KEY idx_appointments_start (start_at),
    KEY idx_appointments_customer (customer_id),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointment_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    service_id INT NOT NULL,
    staff_id INT,
    duration_minutes INT NOT NULL,
    price_snapshot DOUBLE NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointment_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by INT,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blocked_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    reason VARCHAR(255) DEFAULT '',
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(191) NOT NULL,
    body TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT ('{}'),
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_notifications_site (site_id),
    KEY idx_notifications_user (user_id, read_at),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── تنظیمات پیامک و پرداخت هر سایت ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_sms_settings (
    site_id INT NOT NULL PRIMARY KEY,
    provider VARCHAR(30) NOT NULL DEFAULT 'melipayamak',
    is_enabled TINYINT NOT NULL DEFAULT 0,
    credentials_json TEXT NOT NULL DEFAULT ('{}'),
    patterns_json TEXT NOT NULL DEFAULT ('{}'),
    events_json TEXT NOT NULL DEFAULT ('{}'),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_payment_settings (
    site_id INT NOT NULL PRIMARY KEY,
    provider VARCHAR(30) NOT NULL DEFAULT 'zibal',
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'zibal',
    zibal_merchant VARCHAR(191) NOT NULL DEFAULT '',
    card_number VARCHAR(32) NOT NULL DEFAULT '',
    card_holder VARCHAR(150) NOT NULL DEFAULT '',
    enamad_code TEXT,
    is_enabled TINYINT NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    appointment_id INT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    provider VARCHAR(30) NOT NULL DEFAULT 'zibal',
    track_id VARCHAR(100) NULL,
    ref_number VARCHAR(100) NULL,
    receipt_path VARCHAR(255) NULL,
    admin_note TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_payments_site (site_id),
    KEY idx_payments_track (track_id),
    KEY idx_payments_status (status),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sms_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NULL,
    phone VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    provider VARCHAR(30) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'sent',
    response TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_smslogs_site (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level VARCHAR(20) NOT NULL DEFAULT 'error',
    channel VARCHAR(50) NOT NULL DEFAULT 'app',
    site_id INT NULL,
    message TEXT NOT NULL,
    context TEXT,
    ip VARCHAR(64) NULL,
    path VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_syslog_level (level),
    KEY idx_syslog_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS survey_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_id INT NOT NULL,
    appointment_id INT NOT NULL,
    customer_id INT NULL,
    rating TINYINT NOT NULL DEFAULT 5,
    comment TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_survey_site (site_id),
    UNIQUE KEY uq_survey_appointment (appointment_id),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- سرنخ‌های فروش پلتفرم (استخراج از گوگل و پیگیری تماس)
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    person_name VARCHAR(150) NOT NULL,
    business_name VARCHAR(200) NOT NULL DEFAULT '',
    phone VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'new',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    source VARCHAR(50) NOT NULL DEFAULT 'google',
    employee_name VARCHAR(150) NOT NULL DEFAULT '',
    notes TEXT,
    next_follow_up_at DATETIME NULL,
    last_contacted_at DATETIME NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_leads_status (status),
    KEY idx_leads_priority (priority),
    KEY idx_leads_phone (phone),
    KEY idx_leads_created (created_at),
    KEY idx_leads_followup (next_follow_up_at),
    KEY idx_leads_employee (employee_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lead_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    admin_id INT NULL,
    admin_name VARCHAR(150) NOT NULL DEFAULT '',
    type VARCHAR(30) NOT NULL DEFAULT 'note',
    message TEXT,
    old_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_lead_act_lead (lead_id),
    KEY idx_lead_act_created (created_at),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
