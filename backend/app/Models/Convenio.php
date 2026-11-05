<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Convenio extends Model
{
    use HasFactory;

    // 1. Nombre explícito de la tabla en MySQL
    protected $table = 'convenios';

    // 2. Control de Timestamps personalizados
    public $timestamps = true;
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    // 3. Campos asignables de forma masiva (Mass Assignment)
    protected $fillable = [
        'codigo',
        'titulo',
        'tipo',
        'estado',
        'unidad_id',
        'resumen',
        'fecha_inicio',
        'fecha_fin',
        'dias_preaviso',
        'version',
        'creado_por',
    ];

    // 4. Relación: Un convenio pertenece a una Unidad Académica
    public function unidad()
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }

    // 5. Relación: Un convenio fue creado por un Usuario
    public function creador()
    {
        return $this->belongsTo(User::class, 'creado_por');
    }
}