<?php

declare(strict_types=1);

namespace Salon\Http;

final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $headers,
        public readonly ?array $user = null,
    ) {}

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $path = rtrim($path, '/') ?: '/';

        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        $body = [];
        if (str_contains($contentType, 'application/json')) {
            $raw = file_get_contents('php://input') ?: '{}';
            $body = json_decode($raw, true) ?? [];
        } elseif ($method === 'POST') {
            $body = $_POST;
        }

        $headers = [];
        foreach ($_SERVER as $k => $v) {
            if (str_starts_with($k, 'HTTP_')) {
                $name = str_replace('_', '-', strtolower(substr($k, 5)));
                $headers[$name] = $v;
            }
        }

        // Apache + mod_rewrite معمولاً Authorization را به PHP نمی‌رساند
        if (empty($headers['authorization'])) {
            if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
                $headers['authorization'] = $_SERVER['HTTP_AUTHORIZATION'];
            } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
                $headers['authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
            } elseif (function_exists('apache_request_headers')) {
                $apache = apache_request_headers();
                if (is_array($apache)) {
                    foreach ($apache as $k => $v) {
                        $headers[strtolower((string) $k)] = $v;
                    }
                }
            }
        }

        return new self($method, $path, $_GET, $body, $headers, null);
    }

    public function bearerToken(): ?string
    {
        $auth = $this->headers['authorization'] ?? '';
        if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
            return $m[1];
        }
        return null;
    }

    public function withUser(?array $user): self
    {
        return new self($this->method, $this->path, $this->query, $this->body, $this->headers, $user);
    }
}
