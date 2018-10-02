import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'

// import PureRenderMixin from 'react-addons-pure-render-mixin'
// import {GridLayout} from 'react-grid-layout'

//const RGL = ReactGridLayout.WidthProvider(ReactGridLayout);
//import _ from 'lodash'

class BasicLayout1 extends React.Component{

    render() {
        return (
            <React.Fragment>
                <h1>Hi!!!</h1>
            </React.Fragment>
        );
    }
    componentDidMount() {
        console.log("componentDidMount");
        var bob = [{id: 1}, {id: 2},{id: 3}];

        var fffff = _.filter(bob, function(w){return w.id == 1;});
        console.log(fffff);
    }
}

export function renderWidgetEditorPage(args) {
ReactDOM.render(
    <BasicLayout1 />,
    document.getElementById('content')
);
}
