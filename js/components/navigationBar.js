/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const React = require('react')
const ImmutableComponent = require('./immutableComponent')

const cx = require('../lib/classSet.js')
const Button = require('./button')
const UrlBar = require('./urlBar')
const AppActions = require('../actions/appActions')
const {isSiteInList} = require('../state/siteUtil')
const SiteTags = require('../constants/siteTags')
const messages = require('../constants/messages')
const ipc = global.require('electron').ipcRenderer
const { isSourceAboutUrl } = require('../lib/appUrlUtil')

class NavigationBar extends ImmutableComponent {
  constructor () {
    super()
    this.onToggleBookmark = this.onToggleBookmark.bind(this)
    this.onStop = this.onStop.bind(this)
    this.onReload = this.onReload.bind(this)
  }

  get loading () {
    return this.props.activeFrame &&
      this.props.activeFrame.get('loading')
  }

  onToggleBookmark (isBookmarked) {
    if (isBookmarked) {
      AppActions.removeSite(this.props.activeFrame, SiteTags.BOOKMARK)
    } else {
      AppActions.addSite(this.props.activeFrame, SiteTags.BOOKMARK)
    }
  }

  onReload () {
    ipc.emit(messages.SHORTCUT_ACTIVE_FRAME_RELOAD)
  }

  onStop () {
    ipc.emit(messages.SHORTCUT_ACTIVE_FRAME_STOP)
  }

  get bookmarked () {
    return this.props.activeFrame &&
      isSiteInList(this.props.sites, this.props.activeFrame.get('location'), SiteTags.BOOKMARK)
  }

  get titleMode () {
    return this.props.mouseInTitlebar === false &&
      this.props.activeFrame.get('title') &&
      !['about:blank', 'about:newtab'].includes(this.props.activeFrame.get('location')) &&
      !this.loading &&
      !this.props.navbar.getIn(['urlbar', 'focused'])
  }

  componentDidMount () {
    ipc.on(messages.SHORTCUT_ACTIVE_FRAME_BOOKMARK, () => this.onToggleBookmark(false))
    ipc.on(messages.SHORTCUT_ACTIVE_FRAME_REMOVE_BOOKMARK, () => this.onToggleBookmark(true))
  }

  componentDidUpdate (prevProps) {
    // Update the app menu to reflect whether the current page is bookmarked
    const prevBookmarked = prevProps.activeFrame &&
      isSiteInList(prevProps.sites, prevProps.activeFrame.get('location'), SiteTags.BOOKMARK)
    if (this.bookmarked !== prevBookmarked) {
      ipc.send(messages.UPDATE_APP_MENU, {bookmarked: this.bookmarked})
    }
  }

  render () {
    const frameProps = this.props.activeFrame
    if (!frameProps) {
      return null
    }

    return <div id='navigator'
        ref='navigator'
        data-frame-key={frameProps.get('key')}
        className={cx({
          titleMode: this.titleMode
        })}>

      { isSourceAboutUrl(frameProps.get('location')) ? null
        : <div className='startButtons'>
        { this.loading
          ? <Button iconClass='fa-times'
              l10nId='reloadButton'
              className='navbutton stop-button'
              onClick={this.onStop} />
          : <Button iconClass='fa-repeat'
              l10nId='stopButton'
              className='navbutton reload-button'
              onClick={this.onReload} />
        }
      </div>
      }
      <UrlBar ref='urlBar'
        sites={this.props.sites}
        activeFrameProps={frameProps}
        searchDetail={this.props.searchDetail}
        searchSuggestions={this.props.searchSuggestions}
        frames={this.props.frames}
        loading={this.loading}
        titleMode={this.titleMode}
        settings={this.props.settings}
        urlbar={this.props.navbar.get('urlbar')}
        />
      { isSourceAboutUrl(frameProps.get('location')) ? null
      : <div className='endButtons'>
          <Button iconClass={this.titleMode ? 'fa-star' : 'fa-star-o'}
            className={cx({
              'navbutton': true,
              'bookmark-button': true,
              'remove-bookmark-button': this.bookmarked
            })}
            l10nId={this.bookmarked ? 'removeBookmarkButton' : 'removeBookmarkButton'}
            onClick={() => this.onToggleBookmark(this.bookmarked)} />
        </div>
      }
    </div>
  }
}

module.exports = NavigationBar
