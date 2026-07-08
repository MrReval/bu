<?php

declare(strict_types=1);

namespace Salon;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Middleware\AuthMiddleware;
use Salon\Middleware\PlatformAuthMiddleware;

final class Router
{
    /** نشانگر مسیرهای نیازمند احراز هویت سوپرادمین پلتفرم */
    public const PLATFORM = '@platform';

    /** @var array<string, array<string, callable>> */
    private array $routes = [];

    public function get(string $path, callable $handler, ?array $roles = null): void
    {
        $this->add('GET', $path, $handler, $roles);
    }

    public function post(string $path, callable $handler, ?array $roles = null): void
    {
        $this->add('POST', $path, $handler, $roles);
    }

    public function put(string $path, callable $handler, ?array $roles = null): void
    {
        $this->add('PUT', $path, $handler, $roles);
    }

    public function patch(string $path, callable $handler, ?array $roles = null): void
    {
        $this->add('PATCH', $path, $handler, $roles);
    }

    public function delete(string $path, callable $handler, ?array $roles = null): void
    {
        $this->add('DELETE', $path, $handler, $roles);
    }

    private function add(string $method, string $path, callable $handler, ?array $roles): void
    {
        $this->routes[$method][$path] = ['handler' => $handler, 'roles' => $roles];
    }

    public function dispatch(Request $request): void
    {
        if ($request->method === 'OPTIONS') {
            Response::noContent();
        }

        $methodRoutes = $this->routes[$request->method] ?? [];

        foreach ($methodRoutes as $pattern => $route) {
            $params = $this->match($pattern, $request->path);
            if ($params === null) {
                continue;
            }

            $req = $request;
            if ($route['roles'] === [self::PLATFORM]) {
                $req = PlatformAuthMiddleware::handle($request);
            } elseif ($route['roles'] !== null) {
                $req = AuthMiddleware::handle($request, $route['roles']);
            }

            ($route['handler'])($req, $params);
            return;
        }

        Response::error('مسیر یافت نشد', 404);
    }

  /** @return array<string, string>|null */
    private function match(string $pattern, string $path): ?array
    {
        $regex = preg_replace('/\{([a-zA-Z_]+)\}/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';
        if (!preg_match($regex, $path, $m)) {
            return null;
        }
        $params = [];
        foreach ($m as $k => $v) {
            if (is_string($k)) {
                $params[$k] = $v;
            }
        }
        return $params;
    }
}
