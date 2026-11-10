<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class AlertController extends Controller
{
    public function index()
    {
        return $this->success([], 'Lista de alertas obtenida correctamente');
    }
}