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
        'default_plan' => 'starter',
        'plans' => [
            'free' => ['max_devices' => 1, 'name' => 'Free Trial Plan'],
            'starter' => ['max_devices' => 3, 'name' => 'Starter Plan'],
            'pro' => ['max_devices' => 10, 'name' => 'Pro Plan'],
            'enterprise' => ['max_devices' => 99, 'name' => 'Enterprise Plan'],
        ],
    ],
];
