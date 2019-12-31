import { ScreenElementChange } from './../admino-screen.interfaces';
import { AdminoAction, ActionEvent, ActionSubscription } from './../../../interfaces';
import { AdminoScreenComponent } from '../admino-screen.component';
import { FormGroup, FormControl } from '@angular/forms';
import { ScreenElement } from '../admino-screen.interfaces';
import { ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';

export class AdminoScreenElement {
    // @ViewChild('focusRef', { static: true }) focusRef: any;
    @ViewChild('focusRef', { static: true, read: ElementRef }) focusElRef: ElementRef;
    public element: ScreenElement | any;
    // public fields: FieldConfig[];
    public parentGroup: FormGroup;
    public control: FormControl;
    public group: FormGroup;

    public screenComponent: AdminoScreenComponent;
    public rootScreenComponent: AdminoScreenComponent;

    public index: number;
    public controlPath: any;
    // public configChange: Subject<any> = new Subject();
    // public updateEvent: Subject<any> = new Subject();
    // public valueChanges: Subject<any> = new Subject();

    public activeActionSubscriptions: ActionSubscription[] = [];

    isFocused = false;
    boundFocusFunction;
    boundBlurFunction;

    init() {
        if (this.focusElRef) {

            this.boundFocusFunction = this.focusEvent.bind(this);
            this.focusElRef.nativeElement.addEventListener('focus', this.boundFocusFunction, true);

            this.boundBlurFunction = this.blurEvent.bind(this);
            this.focusElRef.nativeElement.addEventListener('blur', this.boundBlurFunction, true);
        }
    }

    handleAction(action: AdminoAction) {
        return new Promise((resolve, reject) => {
            const actionSub: ActionSubscription = {};
            this.activeActionSubscriptions.push(actionSub);
            actionSub.actionEvent = {
                action,
                form: this.screenComponent.group,
                screenConfig: this.rootScreenComponent.screenElement,
                initiatedBy: this.controlPath
            };
            actionSub.subscription = this.screenComponent.handleAction(actionSub.actionEvent).subscribe((result) => {
                this.activeActionSubscriptions.slice(this.activeActionSubscriptions.indexOf(actionSub), 1);
                resolve(result);
            }, (error) => {
                this.activeActionSubscriptions.slice(this.activeActionSubscriptions.indexOf(actionSub), 1);
                reject(error);
            });
        });
    }

    clearSubscriptions() {
        for (const actionSub of this.activeActionSubscriptions) {
            if (actionSub.subscription) {
                actionSub.subscription.unsubscribe();
            }
        }
        this.activeActionSubscriptions = [];
    }


    focus() {
        if (this.focusElRef) {
            if (this.focusElRef.nativeElement) {
                this.focusElRef.nativeElement.focus();
            }
        }
        this.focusEvent();
    }

    blur() {
        if (this.focusElRef) {
            if (this.focusElRef.nativeElement) {
                this.focusElRef.nativeElement.blur();
            }
        }
        this.blurEvent();
    }
    focusEvent() {
        this.isFocused = true;
    }
    blurEvent() {
        this.isFocused = false;

    }
    setValue(value) {
        this.control.setValue(value);
    }
    onChange(changes: { [id: string]: ScreenElementChange; }) {
    }
    destroy() {
        if (this.focusElRef) {
            this.focusElRef.nativeElement.removeEventListener('focus', this.boundFocusFunction);
            this.focusElRef.nativeElement.removeEventListener('blur', this.boundBlurFunction);
        }
    }
}
