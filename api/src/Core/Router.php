<?php
declare(strict_types=1);

namespace App\Core;

class Router {
    private array $routes = [];

    public function add(string $method, string $path, callable|array $handler, array $middleware = []): void {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $this->convertPattern($path),
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }

    public function get(string $path, callable|array $handler, array $middleware = []): void {
        $this->add('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable|array $handler, array $middleware = []): void {
        $this->add('POST', $path, $handler, $middleware);
    }

    public function put(string $path, callable|array $handler, array $middleware = []): void {
        $this->add('PUT', $path, $handler, $middleware);
    }

    public function delete(string $path, callable|array $handler, array $middleware = []): void {
        $this->add('DELETE', $path, $handler, $middleware);
    }

    public function dispatch(string $method, string $uri): void {
        $parsedUrl = parse_url($uri, PHP_URL_PATH) ?? '/';
        $method = strtoupper($method);

        $basePaths = ['/sale_pos/api', '/sale_pos', '/api'];
        foreach ($basePaths as $bp) {
            if (str_starts_with($parsedUrl, $bp)) {
                $parsedUrl = substr($parsedUrl, strlen($bp));
                break;
            }
        }

        $parsedUrl = '/' . ltrim($parsedUrl, '/');

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            if (preg_match($route['pattern'], $parsedUrl, $matches)) {
                $params = array_filter($matches, fn($k) => !is_int($k), ARRAY_FILTER_USE_KEY);

                foreach ($route['middleware'] as $mw) {
                    if (is_callable($mw)) {
                        $mw();
                    } elseif (is_string($mw) && method_exists($mw, 'handle')) {
                        $mw::handle();
                    }
                }

                $handler = $route['handler'];
                if (is_array($handler) && count($handler) === 2) {
                    [$class, $methodName] = $handler;
                    (new $class())->$methodName($params);
                    return;
                }

                if (is_callable($handler)) {
                    $handler($params);
                    return;
                }
            }
        }

        Response::error('Endpoint not found', 404);
    }

    private function convertPattern(string $path): string {
        $clean = '/' . trim($path, '/');
        $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $clean);
        return '#^' . $pattern . '$#';
    }
}
