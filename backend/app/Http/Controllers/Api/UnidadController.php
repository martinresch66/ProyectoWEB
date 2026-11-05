<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Unidad;

class UnidadController extends Controller
{
    public function index()
    {
        return response()->json(Unidad::all(), 200);
    }
}