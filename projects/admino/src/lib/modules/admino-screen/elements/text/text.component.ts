import { Component, OnInit, HostBinding } from '@angular/core';
import { AdminoScreenElement } from '../admino-screen-element';
import { ScreenElementChange } from '../../admino-screen.interfaces';

@Component({
  selector: 'admino-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.scss']
})
export class TextComponent extends AdminoScreenElement implements OnInit {

  @HostBinding('style.color') color = '';
  @HostBinding('style.font-size') size = '';
  @HostBinding('style.text-align') align = '';
  @HostBinding('style.weight') weight = '300';

  ngOnInit() {
    this.onChange(null);
  }
  onChange(changes: { [id: string]: ScreenElementChange; }) {

    this.size = this.element.size;
    if (this.element.color !== undefined) {
      this.color = this.directive.ts.getColor(this.element.color);
    }
    if (this.element.align !== undefined) {
      this.align = this.element.align;
    }
    if (this.element.weight !== undefined) {
      this.weight = this.element.weight;
    }
  }

}
