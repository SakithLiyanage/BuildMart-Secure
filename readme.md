# BuildMart Secure

### Port & Process Cleanup
<!-- cmd code in case of multiple server instances -->
```bash
netstat -ano | findstr :5000
taskkill /PID 12345 /F
```