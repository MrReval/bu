<?php

declare(strict_types=1);

namespace Salon\Controllers;

use Salon\Http\Request;
use Salon\Http\Response;
use Salon\Services\AuthService;

final class AuthController
{
    public static function register(Request $req): void
    {
        try {
            Response::json(AuthService::register($req->body));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage());
        }
    }

    public static function login(Request $req): void
    {
        $login = trim($req->body['login'] ?? $req->body['phone'] ?? '');
        $password = $req->body['password'] ?? '';
        try {
            Response::json(AuthService::login($login, $password));
        } catch (\InvalidArgumentException $e) {
            Response::error($e->getMessage(), 401);
        }
    }

    public static function me(Request $req): void
    {
        Response::json(['user' => [
            'id' => $req->user['id'],
            'name' => $req->user['name'],
            'email' => $req->user['email'],
            'phone' => $req->user['phone'],
            'role' => $req->user['role'],
        ]]);
    }
}
