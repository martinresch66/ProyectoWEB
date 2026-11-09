/**
 * Envío del código MFA. El TP permite simular mail y SMS:
 * acá se "envía" mostrando el mensaje en la consola de la API y, si la simulación
 * está activa, se devuelve el contenido para que la app lo muestre como notificación.
 *
 * Para usar un proveedor real (SMTP, Twilio, etc.) solo hay que cambiar esta función.
 */

export const CANALES = ['email', 'sms', 'push'];

function enmascararEmail(email) {
  const [user, domain] = email.split('@');
  return `${user[0]}${'•'.repeat(Math.max(user.length - 2, 1))}${user.at(-1)}@${domain}`;
}

/** "+54 9 2954 551234" → "+54 9 •••• ••1234" (se ve el código de país y los últimos 4 dígitos). */
function enmascararTelefono(tel) {
  const prefijo = tel.slice(0, 6);
  const medio = tel.slice(6, -4).replace(/\d/g, '•');
  return `${prefijo}${medio}${tel.slice(-4)}`;
}

/** Destinos disponibles para un usuario, enmascarados para mostrar en la app (SMS solo si tiene teléfono). */
export function destinosDe(usuario) {
  return [
    { canal: 'email', destino: enmascararEmail(usuario.email) },
    usuario.telefono && { canal: 'sms', destino: enmascararTelefono(usuario.telefono) },
    { canal: 'push', destino: 'Notificación en este dispositivo' },
  ].filter(Boolean);
}

/** "Envía" el código por el canal elegido y devuelve el mensaje simulado. */
export function enviarCodigo(usuario, canal, codigo, minutos) {
  const destino = destinosDe(usuario).find((d) => d.canal === canal).destino;

  const mensajes = {
    email: {
      titulo: '📧 Nuevo correo · Convenios UNLPam',
      cuerpo: `Tu código de verificación es ${codigo}. Vence en ${minutos} minutos. Si no fuiste vos, ignorá este mensaje.`,
    },
    sms: {
      titulo: '💬 SMS · UNLPAM',
      cuerpo: `UNLPam Convenios: tu código es ${codigo}. No lo compartas con nadie.`,
    },
    push: {
      titulo: '🔐 Código de verificación',
      cuerpo: `Ingresá ${codigo} para completar el inicio de sesión.`,
    },
  };

  const mensaje = mensajes[canal];
  console.log(`\n[MFA simulado] ${canal.toUpperCase()} → ${usuario.email} (${destino})\n  ${mensaje.titulo}\n  ${mensaje.cuerpo}\n`);

  return { canal, destino, ...mensaje };
}
