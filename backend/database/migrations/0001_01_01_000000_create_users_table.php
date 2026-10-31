<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('nombre'); 
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('clave'); // Usamos 'clave' según tu esquema
            
            // Definición del rol y relaciones
            $table->enum('rol', ['admin', 'gestion', 'revision', 'consulta'])->default('consulta');
            $table->foreignId('unidad_id')->nullable(); // Si todavía no tenés la tabla 'unidades', evitamos problemas de FK por ahora
            $table->boolean('activo')->default(true);
            
            $table->rememberToken();
            
            // Columnas de fechas personalizadas
            $table->timestamp('creado_en')->nullable();
            $table->timestamp('actualizado_en')->nullable();
        });

        // Tabla requerida por Laravel Sanctum para los tokens de la API
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('users');
    }
};