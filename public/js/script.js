const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
	container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
	container.classList.remove("right-panel-active");
});

// Obtém referências para os campos de senha e confirmação de senha
const passwordField = document.getElementById('password');
const confirmPasswordField = document.getElementById('confirm-password');

// Função para verificar se as senhas são iguais
function checkPasswordMatch() {
  const password = passwordField.value;
  const confirmPassword = confirmPasswordField.value;

  if (password === confirmPassword) {
    // Senhas coincidem, remover mensagem de erro (se houver)
    confirmPasswordField.setCustomValidity('');
  } else {
    // Senhas não coincidem, exibir mensagem de erro
    confirmPasswordField.setCustomValidity('As senhas não coincidem');
  }
}

// Event listener para verificar as senhas ao digitar
passwordField.addEventListener('input', checkPasswordMatch);
confirmPasswordField.addEventListener('input', checkPasswordMatch);
