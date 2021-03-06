import { isObject } from "lodash";
import { AdminoUniversalEditorComponent } from "./../admino-universal-editor/admino-universal-editor/admino-universal-editor.component";
import { AdminoActionService } from "./../../services/action.service";
import { ConfigService } from "./../../services/config.service";
import { AdminoUserService } from "./../../services/user.service";
import { AdminoMenuItem, AdminoButton, ActionEvent } from "./../../interfaces";
import {
  Component,
  OnInit,
  ViewChild,
  Renderer2,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Inject,
  Input,
  OnDestroy,
  HostListener,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { MediaMatcher } from "@angular/cdk/layout";
import { DOCUMENT } from "@angular/common";
import { AdminoThemeService } from "../../services/theme.service";
import { AdminoSiteService } from "../../services/site.service";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AdminoMenuEvent } from "../../interfaces";
import { slotTransition } from "./main.animation";
import { AdminoApiService } from "../../services/api.service";
import { AdminoPingService } from "../../services/ping.service";

declare var html2canvas: any;

@Component({
  selector: "admino-main",
  templateUrl: "./main.component.html",
  styleUrls: ["./main.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [slotTransition],
})
export class MainComponent implements OnInit, OnDestroy {
  private ngUnsubscribe: Subject<null> = new Subject();

  opened: boolean;
  mobileQuery: MediaQueryList;

  private mobileQueryListener: () => void;

  @ViewChild("scrollAreaRef") scrollAreaRef;
  @ViewChild(AdminoUniversalEditorComponent)
  universalEditor: AdminoUniversalEditorComponent;

  @Input() configPath: string;

  rendererListenerFn;

  menu;
  bottomButtons;

  constructor(
    public ts: AdminoThemeService,
    public site: AdminoSiteService,
    public ping: AdminoPingService,
    public renderer: Renderer2,
    public user: AdminoUserService,
    private api: AdminoApiService,
    private media: MediaMatcher,
    private route: ActivatedRoute,
    public as: AdminoActionService,
    public cs: ConfigService,
    private cd: ChangeDetectorRef,
    @Inject(DOCUMENT) document
  ) {
    // var connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    // var type = connection.effectiveType;
    // console.log(connection)
    // function updateConnectionStatus() {
    //   console.log("Connection type changed from " + type + " to " + connection.effectiveType);
    //   type = connection.effectiveType;
    // }
    // connection.addEventListener('change', updateConnectionStatus);
  }

  ngOnInit() {
    this.cs.loadConfig(this.configPath);
    this.cs.configLoaded.subscribe((config) => {
      if (config) {
        this.ts.init(config.theme);
        this.api.init(config.server);
        this.init();
        this.user.init();
        this.as.init();
        this.ping.init();
      }
    });

    this.user.menu.pipe(takeUntil(this.ngUnsubscribe)).subscribe((menu) => {
      this.menu = menu;
      this.cd.markForCheck();
    });

    this.user.bottomButtons.pipe(takeUntil(this.ngUnsubscribe)).subscribe((buttons) => {
      this.bottomButtons = buttons;
      this.cd.markForCheck();
    });

    this.as.showToolbar.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      this.cd.markForCheck();
    });
  }
  prepareSidebarState() {
    const state = this.site.isSideNavOpen.value ? "opened" : "closed";
    return state;
  }

  init() {
    this.cd.detectChanges();

    // this.nav.onRouteChange.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
    //   this.updateMenus();
    // });

    this.ts.themeChanged.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      if (this.ts.previousTheme) {
        this.renderer.removeClass(document.body, this.ts.previousTheme);
      }
      this.renderer.addClass(document.body, this.ts.currentTheme);
    });

    this.site.screenSizeChange.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      if (this.site.screen.w < this.site.breakpoints.sm) {
        this.site.closeSideNav();
        this.site.closeMessages();
      }
      this.cd.detectChanges();
    });
    this.site.documentElement = document.documentElement;
    // this.rendererListenerFn = this.renderer.listen(this.scrollAreaRef.nativeElement, 'scroll', (evt) => {
    //   this.site.refreshScroll(evt);
    //   this.cd.markForCheck();
    // });
  }
  // getState(outlet: RouterOutlet) {
  //   // const ret = outlet.activatedRoute.component
  //   const ret = (outlet.activatedRoute.url as any).value;
  //   // console.log(this.route.url.value);
  //   return ret;
  // }

  closeSidenav() {
    this.site.closeSideNav();
    this.site.closeMessages();
  }

  menuClicked(menuEvent: AdminoMenuEvent) {
    if (menuEvent.menuItem.action.isBlocking) {
      this.universalEditor.screen.blockingActionRunning = menuEvent.menuItem.action.isBlocking;
    }

    let action: any = {
      type: "backend",
      backendAction: menuEvent.menuItem.action,
    };

    if (isObject(menuEvent.menuItem.action)) {
      action = menuEvent.menuItem.action;
    }

    this.as
      .handleAction({
        action: action,
        initiatedBy: { menuButton: menuEvent.menuItem.id },
        openScreens: this.universalEditor.screen.allOpenScreens,
        screenConfig: this.universalEditor.screen.mainScreenComponent.screenElement,
      })
      .subscribe(
        () => {
          this.universalEditor.screen.blockingActionRunning = 0;
        },
        (error) => {
          this.universalEditor.screen.blockingActionRunning = 0;
        }
      );
  }

  bottomMenuClicked(button: AdminoButton) {
    if (button.action.isBlocking) {
      this.universalEditor.screen.blockingActionRunning = button.action.isBlocking;
    }
    const actionEvent: ActionEvent = {
      action: button.action,
      initiatedBy: { devButton: button.label },
    };
    actionEvent.openScreens = this.universalEditor.screen.allOpenScreens;
    actionEvent.screenConfig = this.universalEditor.screen.mainScreenComponent.screenElement;
    this.as.handleAction(actionEvent).subscribe(
      () => {
        this.universalEditor.screen.blockingActionRunning = 0;
      },
      (error) => {
        this.universalEditor.screen.blockingActionRunning = 0;
      }
    );
  }

  updateMenus() {
    this.traverseMenus(this.user.menu.value);
  }
  traverseMenus(menus: AdminoMenuItem[], level = 0, activeRoute = true) {
    // menus.forEach((menu) => {
    //   let isActive = false;
    //   if (activeRoute && this.nav.activeRoute[level] !== undefined && this.nav.activeRoute[level] === menu.action) {
    //     isActive = true;
    //   }
    //   menu._isActive = isActive;
    //   if (menu.children) {
    //     this.traverseMenus(menu.children, level + 1, isActive);
    //   }
    // });
  }

  ngOnDestroy() {
    // if (this.rendererListenerFn) {
    //   this.rendererListenerFn();
    // }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
