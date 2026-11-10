<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    use HasFactory;

    protected $table = 'notificaciones'; // o 'alertas' según tu base

    protected $fillable = [
        'user_id',
        'titulo',
        'mensaje',
        'leida',
        'convenio_id',
    ];

    protected $casts = [
        'leida' => 'boolean',
    ];

    public function convenio()
    {
        return $this->belongsTo(Convenio::class, 'convenio_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}