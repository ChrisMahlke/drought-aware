/**
 * The useState hook allows us to use state in our functional components.
 * 
 * A useState hook takes the initial value of our state as the only argument, 
 * and it returns an array of two elements.
 * 
 * The first element is our state variable.
 * The second element is a function in which we can use the update the value of the state variable.
 * 
 * React.useState inside a function component generates a single piece of state associated with that component.
 */

import React, { useEffect, useState, createContext } from 'react';
import { miscFns } from 'helper-toolkit-ts';

// Type alias
// In TypeScript, the syntax for creating custom types is to use the type keyword followed by the type name and then an
// assignment to a {} block with the type properties.
//
// The syntax resembles an object literal, where the key is the name of the property and the value is the type this
// property should have. This defines a type AppContextProps that must be an object with the name isMobile that holds a
// boolean value.
type AppContextProps = {
    isMobile: boolean;
}

type AppContextProviderProps = {
    // children: React.ReactNode;
};

// Context lets us pass a value deep into the component tree without explicitly threading it through every component.
export const AppContext = createContext<AppContextProps>(null);

const AppContextProvider: React.FC<AppContextProviderProps> = ({
    children
}) => {

    const [contextProps, setContextProps] = useState<AppContextProps>();

    const init = async () => {
        const values: AppContextProps = {
            isMobile: miscFns.isMobileDevice()
        };

        setContextProps(values);
    }

    // useEffect
    // By using this Hook, you tell React that your component needs to do something after render.
    // React will remember the function you passed (we’ll refer to it as our “effect”), and call it 
    // later after performing the DOM updates.
    useEffect(() => {
        init();
    }, []);

    //
    // https://medium.com/@whwrd/reacts-context-api-in-5-minutes-8188d9b507fe
    //
    // There are two important points to note here. Firstly, the component we’ve created is a Provider component. 
    // This denotes that it will be providing the context throughout the app. 
    return (
        <AppContext.Provider value={contextProps}>
            { contextProps ? children : null}
        </AppContext.Provider>
    );
};

export default AppContextProvider;