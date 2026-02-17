<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>机房设备巡检平台</h1>
        <p>{{ isRegister ? '创建新账号' : '欢迎回来' }}</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <el-form-item v-if="isRegister" prop="role">
          <el-select v-model="form.role" placeholder="选择角色" size="large" style="width: 100%">
            <el-option label="工程师" value="engineer" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="submit-btn"
            @click="handleSubmit"
          >
            {{ isRegister ? '注册' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <span @click="toggleMode">
          {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const isRegister = ref(false)

const form = reactive({
  username: '',
  password: '',
  role: 'engineer'
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const toggleMode = () => {
  isRegister.value = !isRegister.value
  formRef.value?.resetFields()
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    if (isRegister.value) {
      await userStore.register(form)
      ElMessage.success('注册成功')
    } else {
      await userStore.login({ username: form.username, password: form.password })
      ElMessage.success('登录成功')
    }
    router.push('/')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  font-size: 24px;
  color: #333;
  margin-bottom: 8px;
}

.login-header p {
  color: #666;
  font-size: 14px;
}

.login-form {
  margin-top: 20px;
}

.submit-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.submit-btn:hover {
  opacity: 0.9;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
}

.login-footer span {
  color: #667eea;
  cursor: pointer;
  font-size: 14px;
}

.login-footer span:hover {
  text-decoration: underline;
}
</style>
