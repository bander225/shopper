import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Customer from "./pages/Customer";
import Driver from "./pages/Driver";
import Admin from "./pages/Admin";
import Government from "./pages/Government";
import PlaceExplore from "./pages/PlaceExplore";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ShopperChat from "./pages/ShopperChat";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/customer"} component={Customer} />
      <Route path={"/driver"} component={Driver} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/government"} component={Government} />
      <Route path={"/explore"} component={PlaceExplore} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/shopper-chat"} component={ShopperChat} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
