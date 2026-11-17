<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DetallePasantia extends Model
{
    use HasFactory;

    protected $table = 'detalles_pasantia';
    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $fillable = [
        'convenio_id',
        'estudiante_persona_id',
        'tutor_academico_persona_id',
        'tutor_institucion_persona_id',
        'carrera',
        'horas_semanales',
        'monto_estimulo',
        'aseguradora',
        'numero_poliza',
    ];

    public function estudiante()       { return $this->belongsTo(Persona::class, 'estudiante_persona_id'); }
public function tutorAcademico()   { return $this->belongsTo(Persona::class, 'tutor_academico_persona_id'); }
public function tutorInstitucion() { return $this->belongsTo(Persona::class, 'tutor_institucion_persona_id'); }
}