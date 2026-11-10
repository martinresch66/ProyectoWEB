<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Unidad extends Model
{
    use HasFactory;//Te permite usar las Factories de Laravel (generadores de datos falsos de prueba con librerías como Faker). Unidad::factory()->count(50)->create(); crea 50 unidades


    protected $table = 'unidades';

    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $fillable = [
        'nombre',
        'codigo',
        'descripcion',
    ];
}