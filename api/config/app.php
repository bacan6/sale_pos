<?php
declare(strict_types=1);

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => (int)(getenv('DB_PORT') ?: 3306),
        'name' => getenv('DB_NAME') ?: 'cafe_pos',
        'user' => getenv('DB_USER') ?: 'root',
        'pass' => getenv('DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],
    'hmac' => [
        'tolerance_seconds' => 300,
        'algorithm' => 'sha256',
    ],
    'sync' => [
        'interval_minutes' => 5,
    ],
    'saas' => [
        'platform_secret' => getenv('PLATFORM_SECRET') ?: 'master_super_secret_key_889922',
        'default_plan' => 'combo_pro',
        'plans' => [
            'pos_starter' => [
                'name' => 'Cafe POS Solo',
                'modules' => 'pos',
                'max_devices' => 3,
                'price' => 150000,
            ],
            'hotel_starter' => [
                'name' => 'Hotel PMS Solo',
                'modules' => 'hotel',
                'max_devices' => 5,
                'price' => 350000,
            ],
            'accounting_solo' => [
                'name' => 'Back-Office Akuntansi Solo',
                'modules' => 'accounting',
                'max_devices' => 3,
                'price' => 200000,
            ],
            'pos_accounting' => [
                'name' => 'Cafe POS + Akuntansi',
                'modules' => 'pos,accounting',
                'max_devices' => 6,
                'price' => 300000,
            ],
            'hotel_accounting' => [
                'name' => 'Hotel PMS + Akuntansi',
                'modules' => 'hotel,accounting',
                'max_devices' => 8,
                'price' => 500000,
            ],
            'combo_pro' => [
                'name' => 'All-in-One Combo (Hotel + POS + Akuntansi)',
                'modules' => 'combo',
                'max_devices' => 15,
                'price' => 650000,
            ],
            'enterprise' => [
                'name' => 'Enterprise Unlimited (Semua Modul)',
                'modules' => 'all',
                'max_devices' => 99,
                'price' => 1200000,
            ],
        ],
    ],
];
