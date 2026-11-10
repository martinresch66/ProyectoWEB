<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ObservacionRevision extends Model
{
    use HasFactory;

    protected $table = 'observaciones_revision';
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $fillable = [
        'convenio_id',
        'usuario_revisor_id',
        'observacion',
        'esta_resuelta',
    ];
}