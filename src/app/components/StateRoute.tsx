/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable max-len */
/* eslint-disable object-curly-newline */
import React, { useState } from 'react';
import {
  MemoryRouter as Router,
  Route,
  NavLink,
  Switch,
} from 'react-router-dom';
import Tree from './Tree';
import ComponentMap from './ComponentMap';
import PerfView from './PerfView';
import AtomsRelationship from './AtomsRelationship';

const History = require('./History').default;

const ErrorHandler = require('./ErrorHandler').default;

const NO_STATE_MSG = 'No state change detected. Trigger an event to change state';
// eslint-disable-next-line react/prop-types

interface StateRouteProps {
  snapshot: {
    name?: string;
    componentData?: object;
    state?: string | object;
    stateSnaphot?: object;
    children?: any[];
    AtomsRelationship?: any[];
  };
  hierarchy: any;
  snapshots: [];
  viewIndex: number;
}

const StateRoute = (props: StateRouteProps) => {
  const { snapshot, hierarchy, snapshots, viewIndex } = props;

  let isRecoil = snapshot.AtomsRelationship ? true : false;
  const [noRenderData, setNoRenderData] = useState(false);

  const [{ x, y, k }, setZoomState]: any = useState({
    x: 150,
    y: 250,
    k: 0.75,
  });

  //Map
  const renderComponentMap = () => {
    if (hierarchy) {
      return <ComponentMap viewIndex={viewIndex} snapshots={snapshots} x={x} y={y} k={k} setZoomState={setZoomState} />;
    }
    return <div className="noState">{NO_STATE_MSG}</div>;
  };


  // the hierarchy gets set on the first click in the page
  // when the page is refreshed we may not have a hierarchy, so we need to check if hierarchy was initialized
  // if true involk render chart with hierarchy
  const renderHistory = () => {
    if (hierarchy.children.length > 0) {

      return <History hierarchy={hierarchy} />;
    }
    return <div className="noState">Application not compatible with history</div>;
  };

  const renderAtomsRelationship = () => {
    return <AtomsRelationship atomsRel={snapshot.AtomsRelationship} />;
  };

  // the hierarchy gets set on the first click in the page
  // when the page is refreshed we may not have a hierarchy, so we need to check if hierarchy was initialized
  // if true involk render Tree with snapshot
  const renderTree = () => {
    if (hierarchy) {
      return <Tree snapshot={snapshot} />;
    }
    return <div className="noState">{NO_STATE_MSG}</div>;
  };
  
  let perfChart;
  if (true) {
    
    perfChart = (
      <PerfView
        viewIndex={viewIndex}
        snapshots={snapshots}
        setNoRenderData={setNoRenderData}
        width={600}
        height={1000}
      />
    );
  }

  //This will intermitently block Recoil PerfCharts from rendering
  // else {
  //   perfChart = (
  //     <div className="no-data-message">
  //       Application must be running in development mode in order to view
  //       performance data
  //     </div>
  //   );
  // }

  const renderPerfView = () => <ErrorHandler>{perfChart}</ErrorHandler>;

  return (
    <Router>
      <div className="navbar">
        <NavLink
          className="router-link"
          activeClassName="is-active"
          exact
          to="/"
        >
          Tree
        </NavLink>
        <NavLink
          className="router-link"
          activeClassName="is-active"
          to="/history"
        >
          History
        </NavLink>
        <NavLink className="router-link" activeClassName="is-active" to="/map">
          Map
        </NavLink>
        
        {isRecoil && <NavLink className="router-link" activeClassName="is-active" to="/relationship">
          Atoms Relationship
        </NavLink>}

        <NavLink
          className="router-link"
          activeClassName="is-active"
          to="/performance"
        >
          Performance
        </NavLink>
      </div>
      <Switch>
        <Route path="/map" render={renderComponentMap} />
        <Route path="/history" render={renderHistory} />
        <Route path="/relationship" render={renderAtomsRelationship} />
        <Route path="/performance" render={renderPerfView} />
        <Route path="/" render={renderTree} />
      </Switch>
    </Router>
  );
};

export default StateRoute;
