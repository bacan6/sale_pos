<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;

class Database {
    private static ?self $instance = null;
    private PDO $pdo;

    private function __construct(array $config) {
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['name']};charset={$config['charset']}";
        $this->pdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    public static function getInstance(?array $config = null): self {
        if (self::$instance === null) {
            if ($config === null) {
                $appConfig = require __DIR__ . '/../../config/app.php';
                $config = $appConfig['db'];
            }
            self::$instance = new self($config);
        }
        return self::$instance;
    }

    public function pdo(): PDO {
        return $this->pdo;
    }
}
