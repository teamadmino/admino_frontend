import { ESCAPE } from '@angular/cdk/keycodes';
import { Component, OnInit, ViewChild, Injector, InjectionToken, ComponentFactoryResolver, Output, EventEmitter, HostListener, ChangeDetectorRef } from '@angular/core';
import { CdkPortalOutlet, PortalInjector, ComponentPortal } from '@angular/cdk/portal';
export const MODAL_DATA = new InjectionToken<{}>('MODAL_DATA');
export const MODAL_REF = new InjectionToken<{}>('MODAL_REF');

export interface AdminoModalConfig {
  width?: string;
  height?: string;
  nopadding?: boolean;
  data?: any;
  resolver?: any;
  injector?: any;
}

@Component({
  selector: 'admino-modal',
  templateUrl: './admino-modal.component.html',
  styleUrls: ['./admino-modal.component.scss']
})
export class AdminoModalComponent implements OnInit {
  @ViewChild(CdkPortalOutlet, { static: true }) portalOutletRef: CdkPortalOutlet;

  component: any;
  componentResolver: any;
  data: any;
  injector: Injector;
  componentInstance;
  config: AdminoModalConfig = {
    width: 600 + 'px',
    // height: 100 + '%',
    nopadding: true,
  };

  @Output() closeEvent: EventEmitter<any> = new EventEmitter();

  @HostListener('keydown', ['$event']) onKeydownHandler(event: KeyboardEvent) {
    if (event.keyCode === ESCAPE) {
      this.close();
    }
  }


  constructor(private cd: ChangeDetectorRef) {
  }
  createInjector(dataToPass): PortalInjector {
    const injectorTokens = new WeakMap();
    injectorTokens.set(MODAL_DATA, dataToPass);
    injectorTokens.set(MODAL_REF, this);
    return new PortalInjector(this.injector, injectorTokens);
  }
  create() {
    const componentPortal = new ComponentPortal(this.component, null, this.createInjector(this.data), this.componentResolver);
    this.componentInstance = componentPortal.attach(this.portalOutletRef);
    this.cd.markForCheck();
  }
  close() {
    this.closeEvent.next();
  }

  ngOnInit() {

    // // } else {
    // //   this.componentPortal = new ComponentPortal(this.content.component, null,
    // //     this.createInjector(this.cont));
    // // }
  }

}
