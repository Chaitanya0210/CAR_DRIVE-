import { Module, Global } from '@nestjs/common';
import { AuthSecurityService } from './auth-security.service';

@Global()
@Module({
  providers: [AuthSecurityService],
  exports: [AuthSecurityService],
})
export class AuthSecurityModule {}
