<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransicionEstado extends Model
{
    use HasFactory;

    protected $table = 'transiciones_estado';
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = null;

    protected $fillable = [
        'convenio_id',
        'estado_anterior',
        'estado_nuevo',
        'motivo',
        'cambiado_por',
    ];
}