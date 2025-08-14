import React, { useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff, LogOut, Settings, RefreshCw, Shield } from 'lucide-react';
import { sendPasswordResetEmail } from '../services/emailService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  onRegister: (name: string, email: string, password: string) => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
  onNavigateToSettings?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onRegister, user, onLogout, onNavigateToSettings }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [captcha, setCaptcha] = useState({
    verified: false,
    isLoading: false,
    showMathChallenge: false,
    mathQuestion: '',
    mathAnswer: 0,
    userAnswer: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    resetEmail: ''
  });

  // Simular verificación inicial de "No soy un robot"
  const handleInitialCaptchaClick = () => {
    setCaptcha(prev => ({ ...prev, isLoading: true }));
    
    // Simular verificación (en producción sería una llamada real a reCAPTCHA)
    setTimeout(() => {
      const needsChallenge = Math.random() > 0.5; // 50% de probabilidad de necesitar desafío
      
      if (needsChallenge) {
        generateMathChallenge();
      } else {
        setCaptcha(prev => ({ 
          ...prev, 
          verified: true, 
          isLoading: false,
          showMathChallenge: false 
        }));
      }
    }, 2000);
  };

  // Generar desafío matemático
  const generateMathChallenge = () => {
    const operations = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1, num2, answer, question;
    
    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        question = `${num1} + ${num2} = ?`;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 20) + 10;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 - num2;
        question = `${num1} - ${num2} = ?`;
        break;
      case '×':
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 * num2;
        question = `${num1} × ${num2} = ?`;
        break;
      default:
        num1 = 5;
        num2 = 3;
        answer = 8;
        question = '5 + 3 = ?';
    }
    
    setCaptcha({
      verified: false,
      isLoading: false,
      showMathChallenge: true,
      mathQuestion: question,
      mathAnswer: answer,
      userAnswer: ''
    });
  };

  // Reiniciar captcha
  const resetCaptcha = () => {
    setCaptcha({
      verified: false,
      isLoading: false,
      showMathChallenge: false,
      mathQuestion: '',
      mathAnswer: 0,
      userAnswer: ''
    });
  };

  // Verificar respuesta matemática
  const handleMathSubmit = () => {
    const userAnswerNum = parseInt(captcha.userAnswer);
    if (userAnswerNum === captcha.mathAnswer) {
      setCaptcha(prev => ({
        ...prev,
        verified: true,
        showMathChallenge: false,
        userAnswer: ''
      }));
    } else {
      // Generar nuevo desafío si falla
      generateMathChallenge();
    }
  };

  // Manejar cambio en input de respuesta
  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaptcha(prev => ({ ...prev, userAnswer: e.target.value }));
  };

  // Resetear captcha al abrir el modal
  React.useEffect(() => {
    if (isOpen && !user) {
      resetCaptcha();
    }
  }, [isOpen, user]);

  // Limpiar formulario cuando cambia entre login y registro
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setShowForgotPassword(false);
    setFormData({ name: '', email: '', password: '', confirmPassword: '', resetEmail: '' });
    setShowPassword(false);
    resetCaptcha();
  };

  // Limpiar formulario cuando se cierra el modal
  const handleClose = () => {
    setFormData({ name: '', email: '', password: '', confirmPassword: '', resetEmail: '' });
    setShowPassword(false);
    setShowForgotPassword(false);
    setIsResettingPassword(false);
    onClose();
  };

  // Manejar recuperación de contraseña
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar captcha
    if (!captcha.verified) {
      alert('❌ Por favor completa la verificación de captcha correctamente.');
      return;
    }
    
    setIsResettingPassword(true);

    // Verificar si el email existe
    const users = JSON.parse(localStorage.getItem('orchid-users') || '[]');
    const user = users.find((u: any) => u.email === formData.resetEmail);
    
    if (!user) {
      alert('❌ No encontramos una cuenta con este email.');
      setIsResettingPassword(false);
      return;
    }

    // Generar token de recuperación
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hora
    
    // Guardar token en localStorage
    const updatedUsers = users.map((u: any) => 
      u.email === formData.resetEmail 
        ? { ...u, resetToken, resetExpiry, resetRequestedAt: new Date().toISOString() }
        : u
    );
    localStorage.setItem('orchid-users', JSON.stringify(updatedUsers));

    // Enviar email real con link de recuperación
    try {
      const resetLink = `${window.location.origin}/#/reset-password?token=${resetToken}&email=${encodeURIComponent(formData.resetEmail)}`;
      
      const emailSent = await sendPasswordResetEmail({
        customerEmail: formData.resetEmail,
        customerName: user.name,
        resetLink
      });

      if (emailSent) {
        alert(`✅ Se ha enviado un enlace de recuperación a ${formData.resetEmail}.\n\n📧 Revisa tu bandeja de entrada y haz clic en el enlace para cambiar tu contraseña.\n\n⏰ El enlace expira en 1 hora.`);
      } else {
        alert('❌ Error al enviar el email. Por favor intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error enviando email de recuperación:', error);
      alert('❌ Error al enviar el email. Por favor intenta nuevamente.');
    }
    
    setIsResettingPassword(false);
    setShowForgotPassword(false);
    setFormData(prev => ({ ...prev, resetEmail: '' }));
  };

  if (!isOpen) return null;

  // Si el usuario ya está logueado, mostrar perfil
  if (user) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Mi Perfil</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-1">¡Hola, {user.name}!</h3>
              <p className="text-gray-600">{user.email}</p>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg mb-6 border-l-4 border-emerald-500">
              <p className="text-emerald-700 text-sm">
                🌺 ¡Bienvenido de vuelta al Club de Las Orquídeas! Disfruta explorando nuestras hermosas orquídeas y encuentra la perfecta para ti.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => {
                  if (onNavigateToSettings) {
                    onNavigateToSettings();
                    handleClose();
                  }
                }}
                className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span>Configuración de Cuenta</span>
              </button>
              
              <button 
                onClick={() => {
                  onLogout();
                  handleClose();
                }}
                className="w-full flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar formulario de recuperación de contraseña
  if (showForgotPassword) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Recuperar Contraseña</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-blue-700 text-sm">
                📧 Ingresa tu email y te enviaremos una contraseña temporal para que puedas acceder a tu cuenta.
              </p>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Tu correo electrónico"
                  value={formData.resetEmail}
                  onChange={(e) => setFormData({ ...formData, resetEmail: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              {/* Captcha Anti-Bot */}
              <div className="mb-4">
                {!captcha.showMathChallenge ? (
                  // Captcha inicial estilo reCAPTCHA
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={captcha.verified}
                          onChange={handleInitialCaptchaClick}
                          disabled={captcha.isLoading || captcha.verified}
                          className="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer disabled:cursor-not-allowed"
                        />
                        {captcha.isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                          </div>
                        )}
                      </div>
                      <label className="text-sm font-medium text-gray-700 cursor-pointer">
                        No soy un robot
                      </label>
                    </div>
                    
                    {captcha.verified && (
                      <div className="mt-3 flex items-center text-green-600 text-sm">
                        <Shield className="h-4 w-4 mr-2" />
                        <span>Verificación completada ✓</span>
                      </div>
                    )}
                  </div>
                ) : (
                  // Desafío matemático
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-800 mb-2">Resuelve esta operación para continuar:</h3>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-3">{captcha.mathQuestion}</div>
                        <input
                          type="number"
                          value={captcha.userAnswer}
                          onChange={handleAnswerChange}
                          placeholder="Tu respuesta"
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleMathSubmit();
                            }
                          }}
                        />
                      </div>
                    </div>
                      
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={resetCaptcha}
                        className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                      >
                        ← Volver
                      </button>
                      <button
                        type="button"
                        onClick={handleMathSubmit}
                        disabled={!captcha.userAnswer}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Verificar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500 mb-4">
                <p className="text-blue-700 text-xs">
                  💡 {!captcha.showMathChallenge ? 'Marca la casilla para verificar que no eres un bot.' : 'Resuelve la operación matemática para continuar.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isResettingPassword || !captcha.verified}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResettingPassword ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar captcha
    if (!captcha.verified) {
      alert('❌ Por favor completa la verificación de captcha correctamente.');
      return;
    }
    
    if (isLogin) {
      // Verificar si el usuario existe en localStorage
      const users = JSON.parse(localStorage.getItem('orchid-users') || '[]');
      const user = users.find((u: any) => u.email === formData.email && u.password === formData.password);
      
      if (user) {
        onLogin(formData.email, formData.password);
        handleClose();
      } else {
        alert('❌ Credenciales incorrectas. Verifica tu email y contraseña.');
        return;
      }
    } else {
      if (formData.password !== formData.confirmPassword) {
        alert('❌ Las contraseñas no coinciden. Por favor, verifica e intenta nuevamente.');
        return;
      }
      
      if (formData.password.length < 6) {
        alert('❌ La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      
      // Guardar usuario en localStorage
      const users = JSON.parse(localStorage.getItem('orchid-users') || '[]');
      
      // Verificar si el email ya existe
      const existingUser = users.find((u: any) => u.email === formData.email);
      if (existingUser) {
        alert('❌ Ya existe una cuenta con este email. Intenta iniciar sesión.');
        return;
      }
      
      const newUser = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem('orchid-users', JSON.stringify(users));
      
      onRegister(formData.name, formData.email, formData.password);
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {!isLogin && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirmar contraseña"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
            )}

            {/* Captcha Anti-Bot */}
            <div className="mb-4">
              {!captcha.showMathChallenge ? (
                // Captcha inicial estilo reCAPTCHA
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={captcha.verified}
                        onChange={handleInitialCaptchaClick}
                        disabled={captcha.isLoading || captcha.verified}
                        className="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer disabled:cursor-not-allowed"
                      />
                      {captcha.isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                        </div>
                      )}
                    </div>
                    <label className="text-sm font-medium text-gray-700 cursor-pointer">
                      No soy un robot
                    </label>
                  </div>
                  
                  {captcha.verified && (
                    <div className="mt-3 flex items-center text-green-600 text-sm">
                      <Shield className="h-4 w-4 mr-2" />
                      <span>Verificación completada ✓</span>
                    </div>
                  )}
                </div>
              ) : (
                // Desafío matemático
                <div className="bg-white border border-gray-300 rounded-lg p-4">
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-800 mb-2">Resuelve esta operación para continuar:</h3>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-3">{captcha.mathQuestion}</div>
                      <input
                        type="number"
                        value={captcha.userAnswer}
                        onChange={handleAnswerChange}
                        placeholder="Tu respuesta"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleMathSubmit();
                          }
                        }}
                      />
                    </div>
                  </div>
                    
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={resetCaptcha}
                      className="text-gray-600 hover:text-gray-800 text-sm transition-colors"
                    >
                      ← Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleMathSubmit}
                      disabled={!captcha.userAnswer}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verificar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500 mb-4">
              <p className="text-blue-700 text-xs">
                💡 {!captcha.showMathChallenge ? 'Marca la casilla para verificar que no eres un bot.' : 'Resuelve la operación matemática para continuar.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={!captcha.verified}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            {isLogin && (
              <div className="mb-4">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-gray-600 hover:text-emerald-600 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
            <p className="text-gray-600">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              <button
                onClick={toggleMode}
                className="ml-2 text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
              >
                {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;