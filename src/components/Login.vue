<template>
  <div class="login-container">
    <h1 class="title">로그인</h1>
    <form @submit.prevent="handleLogin" class="form">
      <label for="form.username">아이디</label>
      <input v-model="username" type="text" id="username" required placeholder="아이디를 입력하세요" />

      <label for="form.password">비밀번호</label>
      <input v-model="password" type="password" id="password" required placeholder="비밀번호를 입력하세요" />

      <button type="submit">로그인</button>
    </form>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'LoginPage',
  data() {
    return {
      username: '',
      password: ''
    };
  },
  methods: {
    async handleLogin() {
      try {
        const response = await axios.post(`${process.env.VUE_APP_API_URL}/login`, {
          username: this.username,
          password: this.password
        });
        console.log('Login 성공:', response.data);
        this.$router.push('/calendar');
      } catch (error) {
        alert('로그인 실패: 아이디 또는 비밀번호가 틀렸습니다.');
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 2rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffffff, #f1f1f1);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.5s ease-in-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.title {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
  font-size: 1.8rem;
}

.form label {
  display: block;
  margin-top: 1rem;
  color: #444;
  font-weight: bold;
}

.form input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  margin-top: 0.4rem;
  border-radius: 8px;
  border: 1px solid #ccc;
  box-sizing: border-box;
  transition: border 0.3s;
}
.form input:focus {
  border-color: #3eaf7c;
  outline: none;
}

button {
  width: 100%;
  padding: 0.8rem;
  margin-top: 2rem;
  background-color: #3eaf7c;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}
button:hover {
  background-color: #369f6b;
}
</style>
