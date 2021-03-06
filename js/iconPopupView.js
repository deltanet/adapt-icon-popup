define([
    'core/js/adapt',
    './popupView'
], function(Adapt, PopupView) {

    var IconPopupView = Backbone.View.extend({

        className: "extension-icon-popup",

        events: {
            "click .icon-popup-graphic-button": "onItemClicked",
            "click .icon-popup-open-button": "onItemClicked"
        },

        initialize: function () {
            this.listenTo(Adapt, {
              "remove": this.onRemove,
              "audio:updateAudioStatus": this.audioUpdated,
              "pageView:ready": this.render
            });

            this.listenTo(this.model, 'change:_isSubmitted', this.checkAttempts);

            this.elementId = this.model.get("_id");
            this.elementType = this.model.get("_type");

            this.audioIsEnabled = this.model.get('_iconPopup')._audio._isEnabled;
            this.audioChannel = this.model.get('_iconPopup')._audio._channel;

            this.popupView = null;
            this.isPopupOpen = false;
        },

        render: function () {
            var data = this.model.toJSON();
            var template = Handlebars.templates["icon-popup"];

            var audioElement = $('.'+this.elementId).find('.'+this.elementType+'-audio');

            if (audioElement.length) {
              $(this.el).html(template(data)).insertAfter(audioElement);
            } else {
              $(this.el).html(template(data)).prependTo('.'+this.elementId+'>.'+this.elementType+'-inner');
            }

            this.$('.icon-popup-inner').addClass('icon-popup-'+this.elementType);

            if (!this.model.get('displayTitle') && !this.model.get('body')) {
              this.$('.icon-popup-inner').addClass('overlayed');
            }

            _.defer(_.bind(function() {
              this.postRender();
            }, this));
        },

        postRender: function() {
          this.alignItems();
          this.checkAttempts();
        },

        audioUpdated: function() {
          var that = this;
          _.delay(function() {
            that.alignItems();
          }, 300);
        },

        alignItems: function() {
          // Set var for audio toggle button being visible
          if ($('.'+this.elementId).find('.audio-toggle').length && $('.'+this.elementId).find('.audio-toggle').css('display') != 'none') {
            var audioEnabled = true;
            var audioButtonwidth = $('.'+this.elementId).find('.audio-toggle').outerWidth();
            this.$('.icon-popup-inner').addClass('audio-enabled');
          } else {
            var audioEnabled = false;
            this.$('.icon-popup-inner').removeClass('audio-enabled');
          }

          // Check for audio toggle button
          if (audioEnabled) {
            var width = (this.$('.icon-popup-items').width() + 10) + audioButtonwidth;
          } else {
            var width = this.$('.icon-popup-items').width() + 10;
          }

          var elementWidth = $('.'+this.elementId).find('.'+this.elementType+'-header').width();
          var maxWidth = elementWidth - width;

          // Set width on title or body
          if (this.model.get('displayTitle') == "") {
            $('.'+this.elementId).find('.'+this.elementType+'-body-inner').css("max-width", maxWidth);
          } else {
            $('.'+this.elementId).find('.'+this.elementType+'-title-inner').css("max-width", maxWidth);
          }
        },

        checkAttempts: function() {
          var items = this.$('.icon-popup-items').children();

          for (var i = 0, l = items.length; i < l; i++) {
            var item = this.model.get('_iconPopup')._items[i];
            var $item = this.$(items[i]);

            if (item._onlyShowOnFinalAttempt && this.model.get('_attemptsLeft') > 1) {
              $item.hide();
            } else if (item._onlyShowOnFinalAttempt && this.model.get('_isSubmitted') && this.model.get('_attemptsLeft') == 1) {
              $item.hide();
            } else {
              $item.show();
            }
          }
        },

        onItemClicked: function(event) {
            if (event) event.preventDefault();

            var $link = $(event.currentTarget);

            $link.addClass('visited');
            
            var $item = $link.parent();
            var itemModel = this.model.get('_iconPopup')._items[$item.index()];

            // Check for type
            if (itemModel._type) {
              if (itemModel._type === "URL") {
                this.showItemUrl(itemModel);
              } else if (itemModel._type === "Popup") {
                this.showPopup(itemModel);
              }
            } else {
              this.showPopup(itemModel);
            }
        },

        showItemUrl: function(itemModel) {
          var url = itemModel._url._src;
          window.top.open(url);
        },

        showPopup: function(itemModel) {
          if (this.isPopupOpen) return;

          Adapt.trigger('audio:stopAllChannels');

          this.isPopupOpen = true;

          var popupModel = new Backbone.Model(itemModel);

          if (Adapt.audio && this.audioIsEnabled) {
            popupModel.set('audioIsEnabled', this.audioIsEnabled);
            popupModel.set('audioChannel', this.audioChannel);
            popupModel.set('audioId', this.elementId);
          } else {
            popupModel.set('audioIsEnabled', false);
          }

          this.popupView = new PopupView({
              model: popupModel
          });

          Adapt.trigger("notify:popup", {
              _view: this.popupView,
              _isCancellable: true,
              _showCloseButton: false,
              _closeOnBackdrop: true,
              _classes: ''
          });

          this.listenToOnce(Adapt, {
              'popup:closed': this.onPopupClosed
          });

          // Check completion
          if (itemModel._setCompletion) {
            this.model.set("_isComplete", true);
            this.model.set("_isInteractionComplete", true);
          }
        },

        onPopupClosed: function() {
          this.isPopupOpen = false;
        },

        onRemove: function() {
          this.model.set('_iconPopupLoaded', false);
          this.remove();
        }

    });

    return IconPopupView;

});
