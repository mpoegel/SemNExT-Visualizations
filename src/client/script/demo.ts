/// <reference path="../../../typings/tsd.d.ts"/>

var $ = require('jquery'),
    _ = require('underscore');
window.jQuery = $;
var animate = require('velocity-commonjs/velocity.ui');


$(document).ready(() => {
  Demo.attachListeners();
});

/**
 * 
 */
namespace Demo {
    
  /**
   * 
   */
  export function attachListeners(): void {
    $('body').off('click').one('click', '.button', (e: Event) => {
      let $btn = $(e.target),
          action = $btn.attr('data-action');
      switch (action) {
        case 'begin':
          changeStage.next();
          break;
        case 'next':
          changeStage.next();
          break;
        case 'replay':
          changeStage.replay();
          break;
        case 'previous':
          changeStage.prev();
          break;
      }
    });
  }
  
  let changeStage = (() => {
    let s = 0;
    return {
      next: () => {
        playStage[s++].out( playStage[s].in );
      },
      prev: () => {
        playStage[s--].out( playStage[s].in );
      },
      replay: () => {
        playStage[s].out( playStage[s].in );
      },
      restart: () => {
        playStage[s].out( playStage[0].in );
        s = 0;
      }
    };
  })();
  
  /**
   * 
   */
  function animateProgressBar(duration: number): void {
    $('.p-bar .progress').css({ left: 0 });
    animate(document.getElementsByClassName('progress'), {
      left: '400px'
    }, {
      duration: duration
    });
  }
  
  /**
   * 
   */
  function resetProgressBar(cb = _.noop): void {
    animate(document.getElementsByClassName('progress'), {
      opacity: 0
    }, {
      duration: 500,
      complete: () => {
        $('.p-bar .progress').css({
          left: '-1px',
          opacity: 1
        });
        cb();
      }
    });
    
  }
  
  /**
   * 
   */
  function showStageNav(delay: number, cb = _.noop): void {
    $('.stage-nav').css({ display: 'ms-flex' });
    $('.stage-nav').css({ display: '-webkit-flex' });
    $('.stage-nav').css({ display: 'flex' });
    animate(document.getElementsByClassName('stage-nav'), {
      opacity: 1
    }, {
      duration: 500,
      delay: delay,
      complete: () => {
        $('.stage-nav .button').css({ cursor: 'pointer' });
        attachListeners();
        cb();
      }
    });
  }
  
  /**
   * 
   */
  function hideStageNav(cb = _.noop): void {
    $('.stage-nav').css({ display: 'ms-flex' });
    $('.stage-nav').css({ display: '-webkit-flex' });
    $('.stage-nav').css({ display: 'flex' });
    animate(document.getElementsByClassName('stage-nav'), {
      opacity: 0.3
    }, {
      duration: 500,
      complete: () => {
        $('.stage-nav .button').css({ cursor: 'default' });
        cb();
      }
    });
  }
  
  let playStage = new Array(10);
  
  playStage[0] = (function() {
    return {
      in: function(cb = _.noop) {
        animate(document.getElementsByClassName('intro'),
          'transition.fadeIn', 
        {
          duration: 1000,
          complete: cb
        });
        animate(document.getElementsByClassName('p-bar'),
          'transition.fadeOut', 
        {
          duration: 100
        });
        animate(document.getElementsByClassName('stage-nav'), {
          opacity: 0
        }, {
          duration: 99
        });
        attachListeners();
      },
      out: function(cb = _.noop) {
        animate(document.getElementsByClassName('intro'),
          'transition.slideLeftOut', 
        {
          duration: 1000,
          complete: cb
        });
        animate(document.getElementsByClassName('p-bar'),
          'transition.fadeIn', 
        {
          duration: 100,
          delay: 1000
        });
        
      }
    }
  })();
  
  playStage[1] = (function() {
    let dur = 2000;
    return {
      in: function(cb = _.noop) {
        animate(document.getElementsByClassName('stage')[0],
          'transition.fadeIn', 
        {
          duration: 500
        });        
        animateProgressBar(dur);
        showStageNav(dur, cb);
      },
      out: function(cb = _.noop) {
        hideStageNav();
        resetProgressBar();
        animate(document.getElementsByClassName('stage')[0],
          'transition.fadeOut', 
        {
          duration: 1000,
          complete: cb
        });
      }
    }
  })();
  
  playStage[2] = (function() {
    let dur = 2000;
    return {
      in: function(cb = _.noop) {
        animate(document.getElementsByClassName('stage')[1],
          'transition.fadeIn', 
        {
          duration: 500
        });
        animateProgressBar(dur);
        showStageNav(dur, cb);
      },
      out: function(cb = _.noop) {
        hideStageNav();
        resetProgressBar();
        animate(document.getElementsByClassName('stage')[1],
          'transition.fadeOut', 
        {
          duration: 1000,
          complete: cb
        });
      }
    }
  })();
  
  playStage[3] = (function() {
    let dur = 2000;
    return {
      in: function(cb = _.noop) {
        animate(document.getElementsByClassName('stage')[2],
          'transition.fadeIn', 
        {
          duration: 500
        });
        animateProgressBar(dur);
        showStageNav(dur, cb);
      },
      out: function(cb = _.noop) {
        hideStageNav();
        resetProgressBar();
        animate(document.getElementsByClassName('stage')[2],
          'transition.fadeOut', 
        {
          duration: 1000,
          complete: cb
        });
      }
    }
  })();
  
}

export = Demo;
