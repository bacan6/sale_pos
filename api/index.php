<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';

use App\Core\Router;

$router = new Router();
require_once __DIR__ . '/routes/api.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = $_SERVER['REQUEST_URI'] ?? '/';

$router->dispatch($method, $uri);
