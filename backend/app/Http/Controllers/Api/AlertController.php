<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class AlertController extends Controller
{
    public function index()
    {
        // Retornamos un array vacío o las alertas básicas para evitar el error 404
        return response()->json([], 200);
    }
}