import { Component, OnInit, ViewChild, OnDestroy, ElementRef, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MatDialog, MatDialogConfig, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { ButtonComponent } from '../../../../../layout/button/button.component';
import { NodeComponent } from '../../../node.component';
import { SnackbarService } from '../../../../../../services/snackbar.service';
import { AppConfig } from 'src/app/app.config';
import { processServiceError } from 'src/app/utils/errors';
import { OperationError } from 'src/app/utils/operation-error';
import { AppsService } from 'src/app/services/apps.service';
import GeneralUtils from 'src/app/utils/generalUtils';
import { Application } from 'src/app/app.datatypes';

/**
 * Modal window used for configuring the Skysocks app.
 */
@Component({
  selector: 'app-skysocks-settings',
  templateUrl: './skysocks-settings.component.html',
  styleUrls: ['./skysocks-settings.component.scss']
})
export class SkysocksSettingsComponent implements OnInit, OnDestroy {
  @ViewChild('button', { static: false }) button: ButtonComponent;
  @ViewChild('firstInput', { static: false }) firstInput: ElementRef;
  form: FormGroup;

  private operationSubscription: Subscription;
  private formSubscription: Subscription;

  /**
   * Opens the modal window. Please use this function instead of opening the window "by hand".
   */
  public static openDialog(dialog: MatDialog, app: Application): MatDialogRef<SkysocksSettingsComponent, any> {
    const config = new MatDialogConfig();
    config.data = app;
    config.autoFocus = false;
    config.width = AppConfig.mediumModalWidth;

    return dialog.open(SkysocksSettingsComponent, config);
  }

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: Application,
    private appsService: AppsService,
    private formBuilder: FormBuilder,
    private dialogRef: MatDialogRef<SkysocksSettingsComponent>,
    private snackbarService: SnackbarService,
    private dialog: MatDialog,
  ) { }

  ngOnInit() {
    this.form = this.formBuilder.group({
      'password': [''],
      'passwordConfirmation': ['', this.validatePasswords.bind(this)],
    });

    this.formSubscription = this.form.get('password').valueChanges.subscribe(() => {
      this.form.get('passwordConfirmation').updateValueAndValidity();
    });

    setTimeout(() => (this.firstInput.nativeElement as HTMLElement).focus());
  }

  ngOnDestroy() {
    this.formSubscription.unsubscribe();
    if (this.operationSubscription) {
      this.operationSubscription.unsubscribe();
    }
  }

  /**
   * Saves the settings.
   */
  saveChanges() {
    if (!this.form.valid || this.button.disabled) {
      return;
    }

    // Ask for confirmation.

    const confirmationMsg = this.form.get('password').value ?
      'apps.skysocks-settings.change-passowrd-confirmation' : 'apps.skysocks-settings.remove-passowrd-confirmation';

    const confirmationDialog = GeneralUtils.createConfirmationDialog(this.dialog, confirmationMsg);
    confirmationDialog.componentInstance.operationAccepted.subscribe(() => {
      confirmationDialog.close();
      this.continueSavingChanges();
    });
  }

  private continueSavingChanges() {
    this.button.showLoading();

    this.operationSubscription = this.appsService.changeAppSettings(
      // The node pk is obtained from the currently openned node page.
      NodeComponent.getCurrentNodeKey(),
      this.data.name,
      { passcode: this.form.get('password').value },
    ).subscribe({
      next: this.onSuccess.bind(this),
      error: this.onError.bind(this)
    });
  }

  private onSuccess() {
    NodeComponent.refreshCurrentDisplayedData();
    this.snackbarService.showDone('apps.skysocks-settings.changes-made');
    this.dialogRef.close();
  }

  private onError(err: OperationError) {
    this.button.showError();
    err = processServiceError(err);

    this.snackbarService.showError(err);
  }

  private validatePasswords() {
    if (this.form) {
      return this.form.get('password').value !== this.form.get('passwordConfirmation').value
        ? { invalid: true } : null;
    } else {
      return null;
    }
  }
}