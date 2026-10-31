<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    // Desactivamos los timestamps predeterminados de Laravel para usar los del esquema
    public $timestamps = false;

    const CREATED_AT = 'creado_en';
    const UPDATED_AT = 'actualizado_en';

    protected $fillable = [
        'nombre',
        'email',
        'clave',
        'rol',
        'unidad_id',
        'activo',
        'creado_en',
        'actualizado_en',
    ];

    protected $hidden = [
        'clave',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'activo' => 'boolean',
            'creado_en' => 'datetime',
            'actualizado_en' => 'datetime',
        ];
    }

    /**
     * Indicamos a Laravel que la contraseña se almacena en la columna 'clave'
     * en lugar de 'password'.
     */
    public function getAuthPassword()
    {
        return $this->clave;
    }

    /**
     * Relación con la unidad académica a la que pertenece el usuario.
     */
    public function unidad()
    {
        return $this->belongsTo(Unidad::class, 'unidad_id');
    }
}
