class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {...state }
  }

  render() {
    return (
      <div className="App">
        <header>
          <h1><i className="material-icons">lock</i>
          DIGITAL LOCK
          </h1>
          </header>
        <div className="content">

          <div className="content-col left">
            <h1>Configuration</h1>


              <button onClick={this.download.bind(this)}>
                <i className="material-icons">cloud_download</i>Dowload
              </button>

          </div>

          <div className="content-col right">
            {/*<h2>Preview</h2>*/}
            <iframe id="visor" title="app" />
          </div>
        </div>
      </div>

    );
  }
  preview(){
    fetch("scorm12/index.html").then(res=>res.text()).then(response=>{
        this.onloadend(response);
    })

  }

  onloadend(res) {
    let content = res.replace('<div id="root"></div>',`
      <div id='root'></div>
      <script>
        window._babelPolyfill = false;
        window.config=JSON.parse('${JSON.stringify({...this.state, dev: true})}');
      </script>`)
    content = content.replace("bundle.js","scorm12/bundle.js")
    let el = document.getElementById('visor')
    el.contentWindow.document.open();
    el.contentWindow.document.write(content);
    el.contentWindow.document.close();
  }
  download() {
    pkg.generatePackage(this.state);
  }
  componentDidMount(){
    this.preview();
  }

}
console.log(App)
