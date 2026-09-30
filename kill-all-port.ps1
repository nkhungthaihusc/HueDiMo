# kill-ports.ps1
3000,3001,3002,8005,8080,8009 | ForEach-Object {
  $proc = (Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue).OwningProcess
  if ($proc) { Stop-Process -Id $proc -Force; Write-Host "Killed port $_" }
  else { Write-Host "Port $_ is free" }
}
