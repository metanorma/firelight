import { useEffect } from 'react';
import { documentMockData } from '../utility';
import Header from './components/Header';
import Footer from './components/Footer';
import Standard from './components/Standard';
import { useXmlData } from '../context';

function Home() {
    const { setDocumentDetail } = useXmlData();

    useEffect(() => {
        setDocumentDetail({});
    }, [])

    return (
        <>
            <Header />
            <div className="page-home">
                {documentMockData?.length &&
                    documentMockData.map((data: any, index: number) => (
                        <Standard data={data} key={index} />
                    ))}
            </div>

            <Footer />
        </>
    );
}

export default Home;
