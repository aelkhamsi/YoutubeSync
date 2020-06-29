import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material';

import { AuthRoutingModule } from './auth-routing.module';

import { LoginPage } from './pages/login/login.page';
import { SignupPage } from './pages/signup/signup.page';
import { HeaderComponent } from './components/header/header.component';
import { TestComponent } from './components/test/test.component';



@NgModule({
  declarations: [
    LoginPage, 
    SignupPage, 
    HeaderComponent, 
    TestComponent
  ],
  imports: [
    CommonModule,
    MaterialModule,
    AuthRoutingModule
  ]
})
export class AuthModule { }
