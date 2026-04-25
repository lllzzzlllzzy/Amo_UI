# 错误码对照表

用户界面只显示错误码（如 `ERR_LLM_UPSTREAM`），原始错误信息打印在浏览器控制台。

| 错误码 | 含义 | 常见原因 |
|--------|------|----------|
| `ERR_LLM_UPSTREAM` | LLM 上游服务不可达 | 代理地址（xuedingtoken.com）网络不通、服务宕机、DNS 解析失败 |
| `ERR_TIMEOUT` | 请求超时 | LLM 响应过慢、网络抖动 |
| `ERR_RATE_LIMIT` | 请求频率超限 | 短时间内调用次数过多，触发上游限流（HTTP 429） |
| `ERR_CONTEXT_TOO_LONG` | 输入内容超出模型上下文限制 | 对话记录或追问历史过长 |
| `ERR_LLM_AUTH` | LLM API Key 无效或未配置 | 后端 API Key 过期、配置错误 |
| `ERR_LLM_QUOTA` | LLM 账户额度耗尽 | 上游账户余额不足 |
| `ERR_DATABASE` | 数据库操作失败 | 后端数据库连接异常 |
| `ERR_PARSE` | 服务器返回数据格式异常 | LLM 返回了非预期格式，后端解析失败 |
| `ERR_UNKNOWN` | 未匹配到已知错误类型 | 查看浏览器控制台的完整原始错误信息 |

## 排查步骤

1. 打开浏览器开发者工具 → Console，找到 `[ERR_XXX]` 开头的日志，后面跟着原始错误字符串
2. 对照上表定位原因
3. `ERR_LLM_UPSTREAM` 最常见，通常是后端到 LLM 代理的网络问题，重启后端或检查代理配置即可
