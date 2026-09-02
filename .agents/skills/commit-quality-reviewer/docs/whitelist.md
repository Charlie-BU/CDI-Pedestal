# Commit Diff Review 豁免清单

登记已知、短期且可解释的审查豁免。命中且仍有效的条目在审阅中标为 `WAIVED`；修复或到期后应删除并恢复正常审查。

不得豁免密钥、access token、用户资料泄露，认证/授权绕过，注入风险，跨账号缓存污染，或无保护的不可逆破坏。

```yaml
- id: WL-YYYYMMDD-001
  enabled: false
  severity: LOW
  type: known_debt
  match:
    file: src/path/to/file.ts
    contains: "temporary marker"
  reason: "Short explanation of the temporary exception"
  owner: "team"
  created_at: "YYYY-MM-DD"
  expires_at: "YYYY-MM-DD"
```

每条包含文件与关键字、原因、负责人和失效时间；`enabled: false` 的示例不会生效。
