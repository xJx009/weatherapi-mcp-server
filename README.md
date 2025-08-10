

为Claude Desktop提供天气查询功能的MCP服务器，使用WeatherAPI.com接口。

## 功能

- 🌤️ 实时天气查询
- 📅 天气预报（1-14天）
- 📊 历史天气数据
- 🏭 空气质量信息
- ⚠️ 天气预警

## 安装

### 1. 创建项目
```bash
mkdir weatherapi-mcp-server
cd weatherapi-mcp-server
```

### 2. 创建package.json
```json
{
  "name": "weatherapi-mcp-server",
  "version": "0.1.0",
  "type": "module",
  "main": "server.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0"
  }
}
```

### 3. 安装依赖
```bash
npm install
```

### 4. 创建server.js
将提供的服务器代码保存为server.js文件。

## 配置

### 获取API密钥
1. 访问 [WeatherAPI.com](https://www.weatherapi.com/)
2. 注册并获取免费API密钥

### Claude Desktop配置
编辑配置文件：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "weatherapi": {
      "command": "node",
      "args": ["C:/path/to/weatherapi-mcp-server/server.js"],
      "env": {
        "WEATHER_API_KEY": "你的API密钥"
      }
    }
  }
}
```

## 使用

重启Claude Desktop后，可以询问：

- "北京今天的天气如何？"
- "上海未来3天会下雨吗？"
- "纽约昨天的气温是多少？"
- "深圳的空气质量怎么样？"

## 故障排除

**连接失败：**
- 检查API密钥是否正确
- 确认Node.js版本≥18
- 验证文件路径正确

**测试服务器：**
```bash
set WEATHER_API_KEY=你的密钥
node server.js
```

## API限制

WeatherAPI.com免费版：
- 每月100万次调用
- 实时天气 + 3天预报

## 许可证

MIT License
