import React from "react";
import ReactDOM from "react-dom";
import {NavigationBar} from "./components/PageComponents";

function Support() {
    return (
        <section className="container" id="support">
            <div className="row justify-content-center pt-3">
                <div className="col-xl-7 col-lg-10">
                    <h1>New Features</h1>
                    <div className="btn-group-vertical btn-block mb-4">
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Planet_new_imagery_user_doc.pdf"
                            role="button"
                        >
                            &#x1F4BE; Public Planet Imagery
                        </a>
                    </div>
                    <h1>Collect Earth Online Manuals</h1>
                    <div className="btn-group-vertical btn-block mb-4">
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Manual_DataCollector_EN_20210331.pdf"
                            role="button"
                        >
                            &#x1F4BE; Data Collection Manual (English)
                        </a>
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Manual_DataCollector_20200520_espanol.pdf"
                            role="button"
                        >
                            &#x1F4BE; Manual de Recolección de Datos (Español)
                        </a>
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Manual_DataCollector_20210120_francais.pdf"
                            role="button"
                        >
                            &#x1F4BE; Manuel pour la collecte de données (Français)
                        </a>
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Manual_DataCollector_20201124_portugese.pdf"
                            role="button"
                        >
                            &#x1F4BE; Manual de Coleta de Dados (Português)
                        </a>
                    </div>
                    <div className="btn-group-vertical btn-block mb-4">
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Manual_InstitutionProject_EN_20210331.pdf"
                            role="button"
                        >
                            &#x1F4BE; Institution & Project Creation Manual (For Admin)
                        </a>
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Manual_InstitutionProject_20200708_espanol.pdf"
                            role="button"
                        >
                            &#x1F4BE; Manual de Creación de Instituciones y Proyectos (para el Administrador)
                        </a>
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Manual_InstitutionProject_20210120_francais.pdf"
                            role="button"
                        >
                            &#x1F4BE; Manuel de création de projets et de profils d’institution (pour l’administrateur)
                        </a>
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Manual_InstitutionProject_20201124_portugese.pdf"
                            role="button"
                        >
                            &#x1F4BE; Manual de Criação de Instituições e Projetos (para Administrador)
                        </a>
                    </div>
                    <div className="btn-group-vertical btn-block mb-4">
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="/downloads/CEO_Theoretical_Manual.pdf"
                            role="button"
                        >
                            &#x1F4BE; Project Development Theory
                        </a>
                    </div>
                    <h1>Code and Bug Support</h1>
                    <p>Note that Chrome is the only officially supported browser.</p>
                    <div className="btn-group-vertical btn-block mb-4">
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="https://github.com/openforis/collect-earth-online/issues"
                        >
                            &#x1F517; Github Issue Tracker
                        </a>
                        <a
                            className="btn btn-outline-lightgreen btn-block"
                            href="http://www.openforis.org"
                        >
                            &#x1F517; OpenForis Website
                        </a>
                    </div>
                    <h1>Collect Earth Online Tutorials</h1>
                    <p className="text-center col-lg-10 offset-lg-1 mb-4">
                        This content is currently under development. Please check
                        back later for updates.
                    </p>
                    <h1>Collect Earth Online Demo</h1>
                    <p className="text-center col-lg-10 offset-lg-1 mb-4">
                        This content is currently under development. Please check
                        back later for updates.
                    </p>
                    <h1>Geo-Dash Help Center</h1>
                    <p className="text-center col-lg-10 offset-lg-1 mb-4">
                        Please access the <a href="/geo-dash/geo-dash-help" rel="noreferrer" target="_blank">Geo-Dash Help Center</a>
                        for details on configuring the Geo-Dash for your project.
                    </p>
                    <h1>Terms of Service</h1>
                    <p className="text-center col-lg-10 offset-lg-1 mb-4">
                        Please view our <a href="/terms-of-service">Terms of Service here</a>.
                    </p>
                </div>
            </div>
        </section>
    );
}

export function pageInit(args) {
    ReactDOM.render(
        <NavigationBar
            userId={args.userId}
            userName={args.userName}
            version={args.version}
        >
            <Support/>
        </NavigationBar>,
        document.getElementById("app")
    );
}
