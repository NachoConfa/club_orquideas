import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface ResetPasswordProps {
  onBack: () => void;
  onPasswordReset: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBack, onPasswordReset }) => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Verificar token al cargar la página
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const token = urlParams.get('token');
    const email = urlParams.get('email');

    if (!token || !email) {
      setError('Enlace de recuperación inválido o expirado.');
      return;
    }

    // Verificar token en localStorage
    const users = JSON.parse(localStorage.getItem('orchid-users') || '[]');
    const user = users.find((u: any) => 
      u.email === decodeURIComponent(email) && 
      u.resetToken === token &&
      new Date(u.resetExpiry) > new Date()
    );

    if (user) {
      setTokenValid(true);
      setUserEmail(user.email);
      setUserName(user.name);
    } else {
      setError('Enlace de recuperación inválido o expirado.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setIsResetting(true);

    try {
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Actualizar contraseña en localStorage
      const users = JSON.parse(localStorage.getItem('orchid-users') || '[]');
      const updatedUsers = users.map((u: any) => {
        if (u.email === userEmail) {
          return {
            ...u,
            password: formData.newPassword,
            resetToken: null,
            resetExpiry: null,
            passwordUpdatedAt: new Date().toISOString()
          };
        }
        return u;
      });

      localStorage.setItem('orchid-users', JSON.stringify(updatedUsers));

      setResetComplete(true);
    } catch (error) {
      setError('Error al actualizar la contraseña. Inténtalo de nuevo.');
    } finally {
      setIsResetting(false);
    }
  };

  if (resetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Contraseña Actualizada!</h2>
            <p className="text-gray-600">
              Tu contraseña ha sido cambiada exitosamente, {userName}.
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
            <p className="text-green-700 text-sm">
              🔐 Ahora puedes iniciar sesión con tu nueva contraseña.
            </p>
          </div>
          
          <button
            onClick={onPasswordReset}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Enlace Inválido</h2>
            <p className="text-gray-600 mb-4">
              {error || 'El enlace de recuperación ha expirado o no es válido.'}
            </p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
            <p className="text-red-700 text-sm">
              ⏰ Los enlaces de recuperación expiran después de 1 hora por seguridad.
            </p>
          </div>
          
          <button
            onClick={onBack}
            className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 transition-colors mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver</span>
          </button>
          
          <div className="text-center">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Cambiar Contraseña</h2>
            <p className="text-gray-600">
              Hola {userName}, ingresa tu nueva contraseña
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showPasswords.new ? 'text' : 'password'}
              placeholder="Nueva contraseña"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              placeholder="Confirmar nueva contraseña"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <h4 className="font-semibold text-blue-800 mb-2">Requisitos de Contraseña:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li className={`flex items-center ${formData.newPassword.length >= 6 ? 'text-green-600' : ''}`}>
                <span className="mr-2">{formData.newPassword.length >= 6 ? '✓' : '•'}</span>
                Mínimo 6 caracteres
              </li>
              <li className={`flex items-center ${formData.newPassword === formData.confirmPassword && formData.confirmPassword ? 'text-green-600' : ''}`}>
                <span className="mr-2">{formData.newPassword === formData.confirmPassword && formData.confirmPassword ? '✓' : '•'}</span>
                Las contraseñas deben coincidir
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isResetting || formData.newPassword.length < 6 || formData.newPassword !== formData.confirmPassword}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Lock className="h-5 w-5" />
            <span>{isResetting ? 'Actualizando...' : 'Cambiar Contraseña'}</span>
          </button>
        </form>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
          <p className="text-yellow-700 text-sm">
            🔒 Por tu seguridad, este enlace expirará automáticamente después de usarlo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;