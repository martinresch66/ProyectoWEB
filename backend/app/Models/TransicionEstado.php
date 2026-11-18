<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/*
Cada vez que se ejecuta ConvenioController::transition(), dentro de la misma transacción atómica
 (DB::transaction), se inserta una fila nueva aquí dejando registrada la trazabilidad legal del expediente. 
 */
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