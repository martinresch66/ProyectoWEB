<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Convenio extends Model
{
    use HasFactory;

    protected $table = 'convenios';

    // Timestamps personalizados
    public $timestamps = true;
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

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

    /**
     * Alcance por rol (único lugar donde vive esta regla):
     * - admin / revision: todos
     * - gestion: los de su unidad
     * - consulta: firmados y no vencidos de su unidad
     */
    public function scopeVisiblePara($query, $user)
    {
        return match ($user->rol) {
            'admin', 'revision' => $query,
            'gestion'  => $query->where('unidad_id', $user->unidad_id),
            'consulta' => $query->where('unidad_id', $user->unidad_id)
                                ->where('estado', 'firmado')
                                ->where(function ($q) {
                                    $q->whereNull('fecha_fin')
                                      ->orWhere('fecha_fin', '>=', now()->toDateString());
                                }),
            default    => $query->whereRaw('1 = 0'),
        };
    }

    // Unidad académica
    public function unidad()
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }

    // Creador (usuario)
    public function creador()
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    // N:M con Partes
    public function partes()
    {
        return $this->belongsToMany(Parte::class, 'partes_convenio', 'convenio_id', 'parte_id')
                    ->withPivot('rol_en_convenio');
    }

    // N:M con Personas
    public function personas()
    {
        return $this->belongsToMany(Persona::class, 'personas_convenio', 'convenio_id', 'persona_id')
                    ->withPivot('rol');
    }

    // 1:1 con Pasantía
    public function detallePasantia()
    {
        return $this->hasOne(DetallePasantia::class, 'convenio_id');
    }

    // Vínculos donde este convenio es origen
    public function vinculosOrigen()
    {
        return $this->hasMany(VinculoConvenio::class, 'convenio_origen_id');
    }

    // Vínculos donde este convenio es destino
    public function vinculosDestino()
    {
        return $this->hasMany(VinculoConvenio::class, 'convenio_destino_id');
    }

    // Documentos adjuntos
    public function documentos()
    {
        return $this->hasMany(Documento::class, 'convenio_id');
    }

    // Historial de transiciones de estado
    public function transiciones()
    {
        return $this->hasMany(TransicionEstado::class, 'convenio_id');
    }

    // Observaciones de revisión (CORREGIDO: apuntaba a Observacion::class)
    public function observaciones()
    {
        return $this->hasMany(ObservacionRevision::class, 'convenio_id');
    }
}