/* eslint-disable react/prop-types */
/* eslint-disable semi */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

class ErrorHandler extends React.Component {
  constructor(props:any) {
    super(props);
    this.state = { errorOccurred: false };
  }

  componentDidCatch(error:string, info:string) {
    this.setState({ errorOccurred: true });
  }

  render() {
    return this.state.errorOccurred ? <div>Unexpected Error</div> : this.props.children
  }
}

export default ErrorHandler;
